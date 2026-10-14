import { db } from "@/lib/core/db";
import { getTodayRange, getThisWeekRange, getThisMonthRange } from "./dates";

export type LifeView = "all" | "personal" | "business";

export type PeriodTotals = {
  spentToday: number;
  spentWeek: number;
  spentMonth: number;
  incomeToday: number;
  incomeWeek: number;
  incomeMonth: number;
};

export function parseView(value: string | undefined): LifeView {
  return value === "personal" || value === "business" ? value : "all";
}

function typeWhere(view: LifeView) {
  return view === "all" ? {} : { type: view.toUpperCase() as "PERSONAL" | "BUSINESS" };
}

export async function getPeriodTotals(view: LifeView): Promise<PeriodTotals> {
  const where = typeWhere(view);
  const today = getTodayRange();
  const week = getThisWeekRange();
  const month = getThisMonthRange();

  async function sumExpenses(start: Date, end: Date) {
    const result = await db.expense.aggregate({
      _sum: { amount: true },
      where: { ...where, date: { gte: start, lt: end } },
    });
    return Number(result._sum.amount ?? 0);
  }

  async function sumIncome(start: Date, end: Date) {
    const result = await db.incomeEntry.aggregate({
      _sum: { amount: true },
      where: { ...where, date: { gte: start, lt: end } },
    });
    return Number(result._sum.amount ?? 0);
  }

  const [spentToday, spentWeek, spentMonth, incomeToday, incomeWeek, incomeMonth] =
    await Promise.all([
      sumExpenses(today.start, today.end),
      sumExpenses(week.start, week.end),
      sumExpenses(month.start, month.end),
      sumIncome(today.start, today.end),
      sumIncome(week.start, week.end),
      sumIncome(month.start, month.end),
    ]);

  return { spentToday, spentWeek, spentMonth, incomeToday, incomeWeek, incomeMonth };
}

export type CategoryBucket = { label: string; amount: number };

export async function getExpenseCategoryBreakdown(view: LifeView): Promise<CategoryBucket[]> {
  const where = typeWhere(view);
  const month = getThisMonthRange();

  const grouped = await db.expense.groupBy({
    by: ["category"],
    where: { ...where, date: { gte: month.start, lt: month.end } },
    _sum: { amount: true },
  });

  return grouped
    .map((g) => ({ label: g.category, amount: Number(g._sum.amount ?? 0) }))
    .sort((a, b) => b.amount - a.amount);
}

export type MonthlySeriesPoint = { month: string; income: number; expense: number };

export async function getMonthlyIncomeVsExpense(
  view: LifeView,
  monthsBack = 6,
): Promise<MonthlySeriesPoint[]> {
  const where = typeWhere(view);
  const now = new Date();
  const points: MonthlySeriesPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));

    const [expenseSum, incomeSum] = await Promise.all([
      db.expense.aggregate({ _sum: { amount: true }, where: { ...where, date: { gte: start, lt: end } } }),
      db.incomeEntry.aggregate({ _sum: { amount: true }, where: { ...where, date: { gte: start, lt: end } } }),
    ]);

    points.push({
      month: start.toLocaleDateString(undefined, { timeZone: "UTC", month: "short", year: "2-digit" }),
      income: Number(incomeSum._sum.amount ?? 0),
      expense: Number(expenseSum._sum.amount ?? 0),
    });
  }

  return points;
}

export type OptionsByType = { personal: string[]; business: string[] };

// Custom values the user types in should stick around as suggestions next
// time — same "grows from usage" behavior as the trade journal's tags.
function mergeOptions(base: string[], used: (string | null)[]): string[] {
  const seen = new Set(base);
  const extra: string[] = [];
  for (const value of used) {
    if (value && !seen.has(value)) {
      seen.add(value);
      extra.push(value);
    }
  }
  return [...base, ...extra];
}

export async function getExpenseCategoryOptions(personalBase: string[], businessBase: string[]): Promise<OptionsByType> {
  const rows = await db.expense.findMany({ distinct: ["category", "type"], select: { category: true, type: true } });
  return {
    personal: mergeOptions(personalBase, rows.filter((r) => r.type === "PERSONAL").map((r) => r.category)),
    business: mergeOptions(businessBase, rows.filter((r) => r.type === "BUSINESS").map((r) => r.category)),
  };
}

export async function getIncomeSourceOptions(personalBase: string[], businessBase: string[]): Promise<OptionsByType> {
  const rows = await db.incomeEntry.findMany({ distinct: ["source", "type"], select: { source: true, type: true } });
  return {
    personal: mergeOptions(personalBase, rows.filter((r) => r.type === "PERSONAL").map((r) => r.source)),
    business: mergeOptions(businessBase, rows.filter((r) => r.type === "BUSINESS").map((r) => r.source)),
  };
}

export async function getSubscriptionCategoryOptions(
  personalBase: string[],
  businessBase: string[],
): Promise<OptionsByType> {
  const rows = await db.subscription.findMany({
    distinct: ["category", "type"],
    select: { category: true, type: true },
    where: { category: { not: null } },
  });
  return {
    personal: mergeOptions(personalBase, rows.filter((r) => r.type === "PERSONAL").map((r) => r.category)),
    business: mergeOptions(businessBase, rows.filter((r) => r.type === "BUSINESS").map((r) => r.category)),
  };
}

export async function getBusinessNetThisMonth(): Promise<number> {
  const month = getThisMonthRange();
  const [expenseResult, incomeResult] = await Promise.all([
    db.expense.aggregate({
      _sum: { amount: true },
      where: { type: "BUSINESS", date: { gte: month.start, lt: month.end } },
    }),
    db.incomeEntry.aggregate({
      _sum: { amount: true },
      where: { type: "BUSINESS", date: { gte: month.start, lt: month.end } },
    }),
  ]);
  return Number(incomeResult._sum.amount ?? 0) - Number(expenseResult._sum.amount ?? 0);
}
