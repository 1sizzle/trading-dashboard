"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";

export async function saveRule(formData: FormData) {
  const id = formData.get("id")?.toString() || null;
  const title = String(formData.get("title") ?? "").trim();
  const setupGrade = String(formData.get("setupGrade") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const order = Number(formData.get("order") ?? 0);

  const data = { title, setupGrade, content, order };

  if (id) {
    await db.playbookRule.update({ where: { id }, data });
  } else {
    await db.playbookRule.create({ data });
  }

  revalidatePath("/dashboard/trading/playbook");
  redirect("/dashboard/trading/playbook");
}

export async function deleteRule(formData: FormData) {
  const id = String(formData.get("id"));
  await db.playbookRule.delete({ where: { id } });
  revalidatePath("/dashboard/trading/playbook");
  redirect("/dashboard/trading/playbook");
}
