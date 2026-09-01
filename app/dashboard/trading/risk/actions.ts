"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";

export async function saveRiskSettings(formData: FormData) {
  const accountSize = Number(formData.get("accountSize"));
  const dailyLossLimit = Number(formData.get("dailyLossLimit"));
  const maxRiskPerTrade = Number(formData.get("maxRiskPerTrade"));

  const data = { accountSize, dailyLossLimit, maxRiskPerTrade };

  // Single-row settings — there's only ever one "current" risk profile.
  const existing = await db.riskSettings.findFirst();
  if (existing) {
    await db.riskSettings.update({ where: { id: existing.id }, data });
  } else {
    await db.riskSettings.create({ data });
  }

  revalidatePath("/dashboard/trading/risk");
  redirect("/dashboard/trading/risk");
}
