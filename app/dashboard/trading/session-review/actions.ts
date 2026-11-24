"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { buildTradeContext } from "@/lib/trading/chat-context";
import { generateDailyReviewCommentary, generateWeeklyReviewCommentary } from "@/lib/trading/review-narrative";
import { formatDateOnly, getNewYorkDayRangeUtc, getNewYorkWeekRangeUtc } from "@/lib/trading/calc";

const PATH = "/dashboard/trading/session-review";

export async function saveDailyReflection(formData: FormData) {
  const dateValue = String(formData.get("date"));
  const reflection = formData.get("reflection")?.toString().trim() || null;
  const date = new Date(`${dateValue}T00:00:00.000Z`);

  await db.dailyReview.upsert({
    where: { date },
    update: { reflection },
    create: { date, reflection },
  });

  revalidatePath(PATH);
  redirect(`${PATH}?view=day&date=${dateValue}`);
}

export async function generateDailyCommentary(formData: FormData) {
  const dateValue = String(formData.get("date"));
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const { start, end } = getNewYorkDayRangeUtc(dateValue);

  // Re-fetch fresh server-side rather than trusting anything from the form —
  // same rule as every other Gemini-backed route in this project.
  const [trades, review] = await Promise.all([
    db.trade.findMany({
      where: { entryTime: { gte: start, lt: end } },
      include: { tags: { include: { tag: true } }, psychology: true },
    }),
    db.dailyReview.findUnique({ where: { date } }),
  ]);

  const context = buildTradeContext(
    trades.map((t) => ({
      symbol: t.symbol,
      direction: t.direction,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      pnl: Number(t.pnl),
      rMultiple: t.rMultiple !== null ? Number(t.rMultiple) : null,
      session: t.session,
      tags: t.tags,
      notes: t.notes,
      entryModel: t.entryModel,
      preTradeThesis: t.preTradeThesis,
      management: t.management,
      review: t.review,
      psychology: t.psychology,
    })),
  );

  let failed = false;
  try {
    const aiCommentary = await generateDailyReviewCommentary(context, review?.reflection ?? null);
    await db.dailyReview.upsert({
      where: { date },
      update: { aiCommentary },
      create: { date, aiCommentary },
    });
  } catch {
    // Best-effort — the reflection (if any) is already saved; redirect with
    // an error flag so the card can show an honest "try again" line instead
    // of silently doing nothing.
    failed = true;
  }

  revalidatePath(PATH);
  redirect(`${PATH}?view=day&date=${dateValue}${failed ? "&aiError=1" : ""}`);
}

export async function saveWeeklyReflection(formData: FormData) {
  const weekStartValue = String(formData.get("weekStart"));
  const reflection = formData.get("reflection")?.toString().trim() || null;
  const weekStart = new Date(`${weekStartValue}T00:00:00.000Z`);

  await db.weeklyReview.upsert({
    where: { weekStart },
    update: { reflection },
    create: { weekStart, reflection },
  });

  revalidatePath(PATH);
  redirect(`${PATH}?view=week&date=${weekStartValue}`);
}

export async function generateWeeklyCommentary(formData: FormData) {
  const weekStartValue = String(formData.get("weekStart"));
  const weekStart = new Date(`${weekStartValue}T00:00:00.000Z`);
  const { start, end } = getNewYorkWeekRangeUtc(weekStartValue);

  const [trades, review, dailyReviews] = await Promise.all([
    db.trade.findMany({
      where: { entryTime: { gte: start, lt: end } },
      include: { tags: { include: { tag: true } }, psychology: true },
    }),
    db.weeklyReview.findUnique({ where: { weekStart } }),
    db.dailyReview.findMany({
      where: { date: { gte: start, lt: end }, reflection: { not: null } },
      orderBy: { date: "asc" },
    }),
  ]);

  const context = buildTradeContext(
    trades.map((t) => ({
      symbol: t.symbol,
      direction: t.direction,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      pnl: Number(t.pnl),
      rMultiple: t.rMultiple !== null ? Number(t.rMultiple) : null,
      session: t.session,
      tags: t.tags,
      notes: t.notes,
      entryModel: t.entryModel,
      preTradeThesis: t.preTradeThesis,
      management: t.management,
      review: t.review,
      psychology: t.psychology,
    })),
  );

  let failed = false;
  try {
    const aiCommentary = await generateWeeklyReviewCommentary(
      context,
      review?.reflection ?? null,
      dailyReviews.map((d) => ({ date: formatDateOnly(d.date), reflection: d.reflection! })),
    );
    await db.weeklyReview.upsert({
      where: { weekStart },
      update: { aiCommentary },
      create: { weekStart, aiCommentary },
    });
  } catch {
    failed = true;
  }

  revalidatePath(PATH);
  redirect(`${PATH}?view=week&date=${weekStartValue}${failed ? "&aiError=1" : ""}`);
}
