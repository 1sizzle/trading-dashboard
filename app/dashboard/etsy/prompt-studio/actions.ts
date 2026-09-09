"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { generatePromptDrafts, normalizePromptText } from "@/lib/etsy/prompt-studio";
import { allocateNextSku } from "@/lib/etsy/sku";
import { generateListingCopy } from "@/lib/etsy/listing-generator";

export async function createPromptWorkspace(formData: FormData) {
  const collectionRequest = String(formData.get("collectionRequest") ?? "").trim();
  const count = Math.min(10, Math.max(1, Number(formData.get("count") ?? 1)));
  const aspectRatio = String(formData.get("aspectRatio") ?? "2:3").trim();

  if (!collectionRequest) {
    throw new Error("Describe the collection you want prompts for");
  }

  // Persisted immediately, before calling Gemini, so the request itself is
  // never lost even if generation fails outright.
  const workspace = await db.etsyPromptWorkspace.create({
    data: { collectionRequest, requestedCount: count },
  });

  await generateAndSavePrompts(workspace.id, collectionRequest, count, aspectRatio, 0);

  revalidatePath("/dashboard/etsy/prompt-studio");
  redirect(`/dashboard/etsy/prompt-studio/${workspace.id}`);
}

export async function retryMissingPrompts(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId"));
  const aspectRatio = String(formData.get("aspectRatio") ?? "2:3").trim();

  const workspace = await db.etsyPromptWorkspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: { prompts: true },
  });

  const missing = workspace.requestedCount - workspace.prompts.length;
  if (missing > 0) {
    await generateAndSavePrompts(
      workspace.id,
      workspace.collectionRequest,
      missing,
      aspectRatio,
      workspace.prompts.length
    );
  }

  revalidatePath(`/dashboard/etsy/prompt-studio/${workspaceId}`);
  redirect(`/dashboard/etsy/prompt-studio/${workspaceId}`);
}

export async function generateListingsFromPrompts(formData: FormData) {
  const promptIds = formData.getAll("promptIds").map(String);
  const workspaceId = String(formData.get("workspaceId"));

  if (promptIds.length === 0) {
    throw new Error("Select at least one prompt");
  }

  let firstProductId: string | null = null;

  for (const promptId of promptIds) {
    try {
      const prompt = await db.etsyPrompt.findUnique({ where: { id: promptId }, include: { product: true } });
      // Retrying only processes prompts that don't already have a product —
      // never duplicates a completed listing.
      if (!prompt || prompt.product) continue;

      const listing = await generateListingCopy(prompt.promptText);
      const sku = await allocateNextSku();

      const product = await db.etsyProduct.create({
        data: {
          sku,
          title: listing.title,
          promptId: prompt.id,
          listingDraft: {
            create: {
              title: listing.title,
              description: listing.description,
              tags: listing.tags,
              suggestedCategory: listing.suggestedCategory,
              suggestedMaterials: listing.suggestedMaterials,
              altText: listing.altText,
              aiDisclosure: listing.aiDisclosure,
              pricingNotes: listing.pricingNotes,
            },
          },
        },
      });

      firstProductId ??= product.id;
    } catch {
      // this one prompt failed — continue processing the rest of the batch
    }
  }

  revalidatePath("/dashboard/etsy/products");
  revalidatePath(`/dashboard/etsy/prompt-studio/${workspaceId}`);

  if (promptIds.length === 1 && firstProductId) {
    redirect(`/dashboard/etsy/products/${firstProductId}/edit`);
  }
  redirect("/dashboard/etsy/products");
}

async function generateAndSavePrompts(
  workspaceId: string,
  collectionRequest: string,
  count: number,
  aspectRatio: string,
  startOrder: number
) {
  const result = await generatePromptDrafts(collectionRequest, count);

  // Saved one at a time — a malformed individual entry is skipped, not fatal
  // to the rest of an otherwise-successful batch.
  let order = startOrder;
  for (const draft of result.prompts) {
    try {
      await db.etsyPrompt.create({
        data: {
          workspaceId,
          promptText: normalizePromptText(draft.sceneDescription, aspectRatio),
          aspectRatio,
          sourceLinks: result.sources,
          evidenceSignals: { limitations: result.limitations },
          confidence: result.confidence,
          order: order++,
        },
      });
    } catch {
      // skip this one entry, keep going
    }
  }

  await db.etsyPromptWorkspace.update({
    where: { id: workspaceId },
    data: { researchDate: new Date(), researchSummary: result.researchSummary },
  });
}
