"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { allocateNextSku } from "@/lib/etsy/sku";
import { parseEtsyListingUrl } from "@/lib/etsy/etsy-url";
import type { EtsyProductStatus } from "@/lib/generated/prisma/client";

const VALID_STATUSES: EtsyProductStatus[] = ["WORKING", "REVIEW", "READY", "LISTED", "ARCHIVED"];

export async function createProduct(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    throw new Error("Title is required");
  }

  const sku = await allocateNextSku();
  const product = await db.etsyProduct.create({ data: { sku, title } });

  revalidatePath("/dashboard/etsy/products");
  redirect(`/dashboard/etsy/products/${product.id}/edit`);
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "");
  const etsyListingUrlRaw = String(formData.get("etsyListingUrl") ?? "").trim();

  if (!title) {
    throw new Error("Title is required");
  }
  if (!VALID_STATUSES.includes(statusRaw as EtsyProductStatus)) {
    throw new Error("Invalid status");
  }
  let status = statusRaw as EtsyProductStatus;

  const existing = await db.etsyProduct.findUniqueOrThrow({ where: { id } });

  let etsyListingUrl: string | null = existing.etsyListingUrl;
  let etsyListingId: string | null = existing.etsyListingId;
  let listedAt = existing.listedAt;

  if (etsyListingUrlRaw) {
    const parsed = parseEtsyListingUrl(etsyListingUrlRaw);
    if (!parsed) {
      throw new Error("That doesn't look like a real Etsy listing URL (expected https://www.etsy.com/listing/{id}/...)");
    }
    etsyListingUrl = etsyListingUrlRaw;
    etsyListingId = parsed.listingId;
    // Saving a valid live URL marks the product Listed and records the publication date,
    // regardless of whatever status was selected in the dropdown — a real URL is the
    // stronger signal.
    status = "LISTED";
    if (!listedAt) {
      listedAt = new Date();
    }
  } else {
    etsyListingUrl = null;
    etsyListingId = null;
    listedAt = null;
  }

  await db.etsyProduct.update({
    where: { id },
    data: { title, status, etsyListingUrl, etsyListingId, listedAt },
  });

  revalidatePath("/dashboard/etsy/products");
  revalidatePath("/dashboard/etsy");
  redirect("/dashboard/etsy/products");
}

export async function saveListingDraft(formData: FormData) {
  const productId = String(formData.get("productId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const suggestedCategory = String(formData.get("suggestedCategory") ?? "").trim() || null;
  const suggestedMaterials = String(formData.get("suggestedMaterials") ?? "").trim() || null;
  const altText = String(formData.get("altText") ?? "").trim() || null;
  const aiDisclosure = String(formData.get("aiDisclosure") ?? "").trim() || null;
  const pricingNotes = String(formData.get("pricingNotes") ?? "").trim() || null;

  if (!title) {
    throw new Error("Title is required");
  }
  if (tags.length !== 13) {
    throw new Error(`Etsy requires exactly 13 tags — you have ${tags.length}`);
  }

  const data = { title, description, tags, suggestedCategory, suggestedMaterials, altText, aiDisclosure, pricingNotes };

  const existing = await db.etsyListingDraft.findUnique({ where: { productId } });
  if (existing) {
    await db.etsyListingDraft.update({ where: { productId }, data });
  } else {
    await db.etsyListingDraft.create({ data: { ...data, productId } });
  }

  revalidatePath(`/dashboard/etsy/products/${productId}/edit`);
  redirect(`/dashboard/etsy/products/${productId}/edit`);
}

export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id"));
  // onDelete: Cascade on EtsyListingDraft/EtsyArtworkAsset handles those rows.
  // This never touches Etsy itself — there's no write capability to Etsy yet,
  // and even once there is, internal deletion must never delete the live listing.
  await db.etsyProduct.delete({ where: { id } });

  revalidatePath("/dashboard/etsy/products");
  revalidatePath("/dashboard/etsy");
  redirect("/dashboard/etsy/products");
}
