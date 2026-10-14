import { db } from "@/lib/core/db";
import { getTodayRange } from "./dates";

// A subscription's nextBillingDate can fall behind if this hasn't run for a
// while (server downtime, a changed date, etc.) — catch up fully rather than
// skip straight to "today", so the expense log doesn't silently lose a real
// charge. Capped so a corrupted date can't loop forever.
const MAX_CATCH_UP_CYCLES = 36;

function addCycle(date: Date, cycle: "MONTHLY" | "YEARLY"): Date {
  const next = new Date(date);
  if (cycle === "YEARLY") {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

export interface SubscriptionBillingResult {
  ok: true;
  subscriptionsDue: number;
  expensesPosted: number;
}

export async function postDueSubscriptions(): Promise<SubscriptionBillingResult> {
  const today = getTodayRange().start;

  const due = await db.subscription.findMany({
    where: { nextBillingDate: { lte: today } },
  });

  let expensesPosted = 0;

  for (const sub of due) {
    let nextDate = sub.nextBillingDate as Date;
    let cycles = 0;

    while (nextDate <= today && cycles < MAX_CATCH_UP_CYCLES) {
      const billedDate = nextDate;
      const rolledDate = addCycle(billedDate, sub.cycle);

      await db.$transaction([
        db.expense.create({
          data: {
            amount: sub.amount,
            category: sub.category ?? "Other",
            type: sub.type,
            note: sub.name,
            date: billedDate,
          },
        }),
        db.subscription.update({ where: { id: sub.id }, data: { nextBillingDate: rolledDate } }),
      ]);

      expensesPosted += 1;
      nextDate = rolledDate;
      cycles += 1;
    }
  }

  return { ok: true, subscriptionsDue: due.length, expensesPosted };
}
