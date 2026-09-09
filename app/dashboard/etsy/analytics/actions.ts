"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";

export async function addAnalyticsRecord(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim() || null;
  const dateRaw = String(formData.get("date") ?? "");
  const views = Number(formData.get("views") ?? 0);
  const favourites = Number(formData.get("favourites") ?? 0);
  const orders = Number(formData.get("orders") ?? 0);
  const revenue = Number(formData.get("revenue") ?? 0);

  if (!dateRaw) {
    throw new Error("Date is required");
  }

  await db.etsyAnalyticsRecord.create({
    data: {
      productId,
      date: new Date(`${dateRaw}T00:00:00.000Z`),
      views,
      favourites,
      orders,
      revenue,
      source: "MANUAL", // synced records will come from a later, still-unbuilt stage
    },
  });

  revalidatePath("/dashboard/etsy/analytics");
  redirect("/dashboard/etsy/analytics");
}
