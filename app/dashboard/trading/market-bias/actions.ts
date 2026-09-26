"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { BIAS_DIRECTIONS, BIAS_SESSIONS } from "@/lib/trading/market-bias";

const PATH = "/dashboard/trading/market-bias";

// One entry per day per session — resubmitting the same date + session updates it.
export async function saveBiasEntry(formData: FormData) {
  const dateRaw = String(formData.get("date") ?? "");
  const session = String(formData.get("session") ?? "");
  const bias = String(formData.get("bias") ?? "");
  const points = Number(String(formData.get("points") ?? "").trim() || 0);
  const note = formData.get("note")?.toString().trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) redirect(PATH);
  if (!BIAS_SESSIONS.some((s) => s.value === session)) redirect(PATH);
  if (!BIAS_DIRECTIONS.some((d) => d.value === bias)) redirect(PATH);
  if (!Number.isFinite(points)) redirect(PATH);

  const date = new Date(`${dateRaw}T00:00:00.000Z`);
  const data = {
    date,
    session: session as "ASIA" | "LONDON" | "NEW_YORK",
    bias: bias as "BULLISH" | "BEARISH" | "NEUTRAL",
    points,
    note,
  };
  await db.marketBiasEntry.upsert({
    where: { date_session: { date, session: data.session } },
    update: data,
    create: data,
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deleteBiasEntry(formData: FormData) {
  await db.marketBiasEntry.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath(PATH);
  redirect(PATH);
}
