"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";

export async function saveEtsySettings(formData: FormData) {
  const currency = String(formData.get("currency") ?? "GBP").trim();
  const fulfillmentProviderRaw = String(formData.get("fulfillmentProvider") ?? "").trim();
  const fulfillmentProvider = fulfillmentProviderRaw || null;
  const skuDigits = Number(formData.get("skuDigits") ?? 3);
  const artworkRatios = String(formData.get("artworkRatios") ?? "")
    .split(",")
    .map((ratio) => ratio.trim())
    .filter(Boolean);

  const data = { currency, fulfillmentProvider, skuDigits, artworkRatios };

  // Single-row settings — there's only ever one "current" Etsy config.
  const existing = await db.etsySettings.findFirst();
  if (existing) {
    await db.etsySettings.update({ where: { id: existing.id }, data });
  } else {
    await db.etsySettings.create({ data });
  }

  revalidatePath("/dashboard/etsy/settings");
  redirect("/dashboard/etsy/settings");
}
