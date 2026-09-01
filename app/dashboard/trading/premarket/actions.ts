"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";

export async function saveChecklist(formData: FormData) {
  const id = formData.get("id")?.toString() || null;
  const dateRaw = String(formData.get("date"));
  const date = new Date(`${dateRaw}T00:00:00.000Z`);
  const bias = String(formData.get("bias") ?? "").trim();
  const keyLevels = String(formData.get("keyLevels") ?? "").trim();
  const notes = formData.get("notes")?.toString().trim() || null;

  const data = { date, bias, keyLevels, notes };

  if (id) {
    // Editing a specific existing row — safe even if the date is changed.
    await db.premarketChecklist.update({ where: { id }, data });
  } else {
    // New entry from the quick-add form — upsert by date so resubmitting
    // today's checklist updates it instead of erroring on the unique date.
    await db.premarketChecklist.upsert({ where: { date }, update: data, create: data });
  }

  revalidatePath("/dashboard/trading/premarket");
  redirect("/dashboard/trading/premarket");
}

export async function deleteChecklist(formData: FormData) {
  const id = String(formData.get("id"));
  await db.premarketChecklist.delete({ where: { id } });
  revalidatePath("/dashboard/trading/premarket");
  redirect("/dashboard/trading/premarket");
}
