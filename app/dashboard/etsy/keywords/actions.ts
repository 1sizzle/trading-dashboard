"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";

export async function addKeyword(formData: FormData) {
  const term = String(formData.get("term") ?? "").trim();
  const niche = String(formData.get("niche") ?? "").trim() || null;

  if (!term) {
    throw new Error("Term is required");
  }

  const existing = await db.etsyKeyword.findUnique({ where: { term } });
  if (!existing) {
    await db.etsyKeyword.create({ data: { term, niche } });
  }

  revalidatePath("/dashboard/etsy/keywords");
  redirect("/dashboard/etsy/keywords");
}

export async function importTagsFromDrafts() {
  const [drafts, existingKeywords] = await Promise.all([
    db.etsyListingDraft.findMany({ select: { tags: true } }),
    db.etsyKeyword.findMany({ select: { term: true } }),
  ]);

  const existingTerms = new Set(existingKeywords.map((k) => k.term));
  const uniqueTags = new Set(drafts.flatMap((d) => d.tags));
  const newTerms = [...uniqueTags].filter((tag) => !existingTerms.has(tag));

  if (newTerms.length > 0) {
    await db.etsyKeyword.createMany({
      data: newTerms.map((term) => ({ term })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/dashboard/etsy/keywords");
  redirect("/dashboard/etsy/keywords");
}
