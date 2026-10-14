"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { dateInputToUtcMidnight, utcMidnightToDateInputValue } from "@/lib/finances/dates";

function parseType(formData: FormData): "PERSONAL" | "BUSINESS" {
  return String(formData.get("type")) === "BUSINESS" ? "BUSINESS" : "PERSONAL";
}

function parseDate(formData: FormData): Date {
  const value = String(formData.get("date") ?? "").trim();
  const dateValue = value || utcMidnightToDateInputValue(new Date());
  return dateInputToUtcMidnight(dateValue);
}

function parseOptionalDate(formData: FormData, field: string): Date | null {
  const value = String(formData.get(field) ?? "").trim();
  return value ? dateInputToUtcMidnight(value) : null;
}

function parseCycle(formData: FormData): "MONTHLY" | "YEARLY" {
  return String(formData.get("cycle")) === "YEARLY" ? "YEARLY" : "MONTHLY";
}

export async function addExpense(formData: FormData) {
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!amount || amount <= 0 || !category) return;

  await db.expense.create({
    data: { amount, category, type: parseType(formData), note, date: parseDate(formData) },
  });

  revalidatePath("/dashboard/finances");
}

export async function addIncome(formData: FormData) {
  const amount = Number(formData.get("amount"));
  const source = String(formData.get("source") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!amount || amount <= 0 || !source) return;

  await db.incomeEntry.create({
    data: { amount, source, type: parseType(formData), note, date: parseDate(formData) },
  });

  revalidatePath("/dashboard/finances");
}

export async function deleteExpense(formData: FormData) {
  const id = String(formData.get("id"));
  await db.expense.delete({ where: { id } });
  revalidatePath("/dashboard/finances");
}

export async function deleteIncome(formData: FormData) {
  const id = String(formData.get("id"));
  await db.incomeEntry.delete({ where: { id } });
  revalidatePath("/dashboard/finances");
}

export async function updateExpense(formData: FormData) {
  const id = String(formData.get("id"));
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  await db.expense.update({
    where: { id },
    data: { amount, category, type: parseType(formData), note, date: parseDate(formData) },
  });

  revalidatePath("/dashboard/finances");
  redirect("/dashboard/finances");
}

export async function updateIncome(formData: FormData) {
  const id = String(formData.get("id"));
  const amount = Number(formData.get("amount"));
  const source = String(formData.get("source") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  await db.incomeEntry.update({
    where: { id },
    data: { amount, source, type: parseType(formData), note, date: parseDate(formData) },
  });

  revalidatePath("/dashboard/finances");
  redirect("/dashboard/finances");
}

export async function addSubscription(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const nextBillingDate = parseOptionalDate(formData, "nextBillingDate");

  // nextBillingDate drives the auto-post cron (lib/finances/subscription-billing.ts)
  // — without it the subscription would just sit there and never bill itself.
  if (!name || !amount || amount <= 0 || !nextBillingDate) return;

  await db.subscription.create({
    data: {
      name,
      amount,
      category,
      note,
      nextBillingDate,
      cycle: parseCycle(formData),
      type: parseType(formData),
    },
  });

  revalidatePath("/dashboard/finances");
}

export async function updateSubscription(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const nextBillingDate = parseOptionalDate(formData, "nextBillingDate");

  if (!nextBillingDate) return;

  await db.subscription.update({
    where: { id },
    data: {
      name,
      amount,
      category,
      note,
      nextBillingDate,
      cycle: parseCycle(formData),
      type: parseType(formData),
    },
  });

  revalidatePath("/dashboard/finances");
  redirect("/dashboard/finances");
}

export async function deleteSubscription(formData: FormData) {
  const id = String(formData.get("id"));
  await db.subscription.delete({ where: { id } });
  revalidatePath("/dashboard/finances");
}
