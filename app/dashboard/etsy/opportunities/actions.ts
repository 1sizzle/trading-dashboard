"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { generateOpportunityScan } from "@/lib/etsy/opportunity-scan";
import { allocateNextSku } from "@/lib/etsy/sku";

export async function createOpportunityScan(formData: FormData) {
  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic) {
    throw new Error("Describe what you want researched");
  }

  const result = await generateOpportunityScan(topic);

  await db.etsyOpportunityScan.create({
    data: { topic, resultsJson: JSON.parse(JSON.stringify(result)) },
  });

  revalidatePath("/dashboard/etsy/opportunities");
  redirect("/dashboard/etsy/opportunities");
}

// Explicit confirmation required before research becomes a real product —
// never created silently as a side effect of scanning.
export async function confirmScanAsProduct(formData: FormData) {
  const topic = String(formData.get("topic") ?? "").trim();

  const sku = await allocateNextSku();
  const product = await db.etsyProduct.create({ data: { sku, title: topic } });

  revalidatePath("/dashboard/etsy/products");
  redirect(`/dashboard/etsy/products/${product.id}/edit`);
}
