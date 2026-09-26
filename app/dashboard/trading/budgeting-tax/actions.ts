"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import { db } from "@/lib/core/db";
import { recommendSetAsidePct, taxYearRange, taxYearStartYear } from "@/lib/tax/uk";

const PATH = "/dashboard/trading/budgeting-tax";
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const RECEIPT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic", "application/pdf"];

function done(year: string | null): never {
  revalidatePath(PATH);
  redirect(year ? `${PATH}?year=${year}` : PATH);
}

function parseDate(value: FormDataEntryValue | null): Date | null {
  const text = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function returnYear(formData: FormData) {
  const year = String(formData.get("year") ?? "");
  return /^\d{4}$/.test(year) ? year : null;
}

async function getOverridePct(): Promise<number | null> {
  const settings = await db.taxSettings.findFirst();
  return settings?.overrideRatePct != null ? Number(settings.overrideRatePct) : null;
}

export async function saveTaxSettings(formData: FormData) {
  const raw = String(formData.get("overrideRate") ?? "").trim();
  const value = raw === "" ? null : Number(raw);
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) done(returnYear(formData));

  const existing = await db.taxSettings.findFirst();
  if (existing) await db.taxSettings.update({ where: { id: existing.id }, data: { overrideRatePct: value } });
  else await db.taxSettings.create({ data: { overrideRatePct: value } });
  done(returnYear(formData));
}

export async function logPayout(formData: FormData) {
  const date = parseDate(formData.get("date"));
  const gross = parseAmount(formData.get("grossAmount"));
  if (!date || gross === null) done(returnYear(formData));

  const accountId = String(formData.get("accountId") ?? "") || null;
  const account = accountId ? await db.tradingAccount.findUnique({ where: { id: accountId } }) : null;

  let pct = Number(String(formData.get("setAsidePct") ?? "").trim());
  if (String(formData.get("setAsidePct") ?? "").trim() === "" || !Number.isFinite(pct)) {
    // No % typed — recommend the extra tax this payout adds on top of that tax year's logged profit.
    const { start, end } = taxYearRange(taxYearStartYear(date!));
    const inYear = { date: { gte: start, lt: end } };
    const [payouts, income, expenses] = await Promise.all([
      db.taxPayout.findMany({ where: inYear, select: { grossAmount: true } }),
      db.taxIncomeEntry.findMany({ where: inYear, select: { amount: true } }),
      db.taxExpenseEntry.findMany({ where: inYear, select: { amount: true } }),
    ]);
    const sum = (rows: { grossAmount?: unknown; amount?: unknown }[]) =>
      rows.reduce((s, r) => s + Number(r.grossAmount ?? r.amount), 0);
    const profitSoFar = sum(payouts) + sum(income) - sum(expenses);
    pct = recommendSetAsidePct(profitSoFar, gross!, await getOverridePct());
  }
  pct = Math.min(100, Math.max(0, pct));

  await db.taxPayout.create({
    data: {
      date: date!,
      accountId: account?.id ?? null,
      accountName: account?.name ?? "Other",
      grossAmount: gross!,
      setAsidePct: pct,
    },
  });
  done(returnYear(formData));
}

export async function deletePayout(formData: FormData) {
  await db.taxPayout.delete({ where: { id: String(formData.get("id")) } });
  done(returnYear(formData));
}

export async function logIncome(formData: FormData) {
  const date = parseDate(formData.get("date"));
  const amount = parseAmount(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  if (!date || amount === null || !category) done(returnYear(formData));

  await db.taxIncomeEntry.create({
    data: { date: date!, amount: amount!, category, description: String(formData.get("description") ?? "").trim() || null },
  });
  done(returnYear(formData));
}

export async function deleteIncome(formData: FormData) {
  await db.taxIncomeEntry.delete({ where: { id: String(formData.get("id")) } });
  done(returnYear(formData));
}

export async function logExpense(formData: FormData) {
  const date = parseDate(formData.get("date"));
  const amount = parseAmount(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  if (!date || amount === null || !category) done(returnYear(formData));

  await db.taxExpenseEntry.create({
    data: { date: date!, amount: amount!, category, description: String(formData.get("description") ?? "").trim() || null },
  });
  done(returnYear(formData));
}

export async function deleteExpense(formData: FormData) {
  await db.taxExpenseEntry.delete({ where: { id: String(formData.get("id")) } });
  done(returnYear(formData));
}

// Store a receipt in the private Blob store; if an amount is given it's also logged as an expense.
export async function uploadReceipt(formData: FormData) {
  const file = formData.get("file");
  const date = parseDate(formData.get("date"));
  if (!(file instanceof File) || file.size === 0 || !date) done(returnYear(formData));
  const f = file as File;
  if (!RECEIPT_TYPES.includes(f.type) || f.size > MAX_RECEIPT_BYTES) done(returnYear(formData));

  const blob = await put(`tax-receipts/${crypto.randomUUID()}-${f.name}`, f, { access: "private" });

  const amount = parseAmount(formData.get("amount"));
  const expense =
    amount !== null
      ? await db.taxExpenseEntry.create({
          data: {
            date: date!,
            amount,
            category: String(formData.get("category") ?? "").trim() || "Other",
            description: String(formData.get("description") ?? "").trim() || `Receipt: ${f.name}`,
          },
        })
      : null;

  await db.taxReceipt.create({
    data: { date: date!, fileName: f.name, url: blob.url, mimeType: f.type, expenseId: expense?.id ?? null },
  });
  done(returnYear(formData));
}

export async function deleteReceipt(formData: FormData) {
  const receipt = await db.taxReceipt.findUnique({ where: { id: String(formData.get("id")) } });
  if (receipt) {
    await del(receipt.url).catch(() => {});
    await db.taxReceipt.delete({ where: { id: receipt.id } });
  }
  done(returnYear(formData));
}
