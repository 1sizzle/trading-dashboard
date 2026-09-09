"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";

export async function createBundle(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const suggestedPriceRaw = String(formData.get("suggestedPrice") ?? "").trim();
  const productIds = formData.getAll("productIds").map(String);

  if (!title) {
    throw new Error("Title is required");
  }
  if (productIds.length < 2) {
    throw new Error("Select at least 2 compatible products for a bundle");
  }

  await db.etsyBundle.create({
    data: {
      title,
      description,
      suggestedPrice: suggestedPriceRaw ? Number(suggestedPriceRaw) : null,
      products: { create: productIds.map((productId) => ({ productId })) },
    },
  });

  revalidatePath("/dashboard/etsy/bundles");
  redirect("/dashboard/etsy/bundles");
}

export async function deleteBundle(formData: FormData) {
  const id = String(formData.get("id"));
  await db.etsyBundle.delete({ where: { id } });

  revalidatePath("/dashboard/etsy/bundles");
  redirect("/dashboard/etsy/bundles");
}
