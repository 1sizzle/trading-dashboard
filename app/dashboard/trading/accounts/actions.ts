"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { ACCOUNT_STATUSES, ACCOUNT_TYPES } from "@/lib/trading/accounts";

const PATH = "/dashboard/trading/accounts";
const MAX_BATCH = 50;

type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];
type AccountStatus = (typeof ACCOUNT_STATUSES)[number]["value"];

function money(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export async function addAccounts(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const status = String(formData.get("status") ?? "");
  const firm = String(formData.get("firm") ?? "").trim() || null;
  const accountSize = money(formData.get("accountSize"));
  const startingBalance = money(formData.get("startingBalance")) ?? accountSize;
  const count = Math.min(MAX_BATCH, Math.max(1, Math.floor(Number(formData.get("count")) || 1)));

  if (!name || accountSize === null || startingBalance === null) redirect(PATH);
  if (!ACCOUNT_TYPES.some((t) => t.value === type) || !ACCOUNT_STATUSES.some((s) => s.value === status)) redirect(PATH);

  // Existing group, or a brand-new one typed into "New group".
  const newGroup = String(formData.get("newGroup") ?? "").trim();
  let groupId = String(formData.get("groupId") ?? "") || null;
  if (newGroup) {
    const group = await db.tradingAccountGroup.upsert({
      where: { name: newGroup },
      update: {},
      create: { name: newGroup },
    });
    groupId = group.id;
  }

  await db.tradingAccount.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      name: count > 1 ? `${name} #${i + 1}` : name,
      type: type as AccountType,
      status: status as AccountStatus,
      firm,
      groupId,
      accountSize,
      startingBalance,
      currentBalance: startingBalance,
    })),
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const balance = money(formData.get("currentBalance"));
  if (!id || !ACCOUNT_STATUSES.some((s) => s.value === status) || balance === null) redirect(PATH);

  await db.tradingAccount.update({
    where: { id },
    data: { status: status as AccountStatus, currentBalance: balance },
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deleteAccount(formData: FormData) {
  await db.tradingAccount.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath(PATH);
  redirect(PATH);
}
