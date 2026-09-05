"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { dateInputToUtcMidnight, utcMidnightToDateInputValue } from "@/lib/life/dates";

function parseType(formData: FormData): "PERSONAL" | "BUSINESS" {
  return String(formData.get("type")) === "BUSINESS" ? "BUSINESS" : "PERSONAL";
}

function parseDate(formData: FormData): Date {
  const value = String(formData.get("date") ?? "").trim();
  const dateValue = value || utcMidnightToDateInputValue(new Date());
  return dateInputToUtcMidnight(dateValue);
}

export async function addExpense(formData: FormData) {
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!amount || amount <= 0 || !category) return;

  await db.expense.create({
    data: { amount, category, type: parseType(formData), note, date: parseDate(formData) },
  });

  revalidatePath("/dashboard/life");
}

export async function addIncome(formData: FormData) {
  const amount = Number(formData.get("amount"));
  const source = String(formData.get("source") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!amount || amount <= 0 || !source) return;

  await db.incomeEntry.create({
    data: { amount, source, type: parseType(formData), note, date: parseDate(formData) },
  });

  revalidatePath("/dashboard/life");
}

export async function deleteExpense(formData: FormData) {
  const id = String(formData.get("id"));
  await db.expense.delete({ where: { id } });
  revalidatePath("/dashboard/life");
}

export async function deleteIncome(formData: FormData) {
  const id = String(formData.get("id"));
  await db.incomeEntry.delete({ where: { id } });
  revalidatePath("/dashboard/life");
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

  revalidatePath("/dashboard/life");
  redirect("/dashboard/life");
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

  revalidatePath("/dashboard/life");
  redirect("/dashboard/life");
}
