import Link from "next/link";
import { db } from "@/lib/core/db";
import { QuickAddMoneyForm } from "@/components/life/QuickAddMoneyForm";
import { MoneyEntryTable, type MoneyEntryRow } from "@/components/life/MoneyEntryTable";
import { CategoryBreakdownChart } from "@/components/life/CategoryBreakdownChart";
import { IncomeVsExpenseChart } from "@/components/life/IncomeVsExpenseChart";
import { StatTile } from "@/components/ui/StatTile";
import {
  PERSONAL_EXPENSE_CATEGORIES,
  BUSINESS_EXPENSE_CATEGORIES,
  PERSONAL_INCOME_SOURCES,
  BUSINESS_INCOME_SOURCES,
} from "@/lib/life/categories";
import {
  parseView,
  getPeriodTotals,
  getExpenseCategoryBreakdown,
  getMonthlyIncomeVsExpense,
  getBusinessNetThisMonth,
  type LifeView,
} from "@/lib/life/aggregate";
import { formatCurrency } from "@/lib/life/format";
import { addExpense, addIncome } from "./actions";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 20;

const VIEW_TABS: { value: LifeView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
];

export default async function LifePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = parseView(params.view);
  const typeWhere = view === "all" ? {} : { type: view.toUpperCase() as "PERSONAL" | "BUSINESS" };

  const [expenses, income, totals, categoryBreakdown, monthlySeries, businessNet] = await Promise.all([
    db.expense.findMany({ where: typeWhere, orderBy: { date: "desc" }, take: RECENT_LIMIT }),
    db.incomeEntry.findMany({ where: typeWhere, orderBy: { date: "desc" }, take: RECENT_LIMIT }),
    getPeriodTotals(view),
    getExpenseCategoryBreakdown(view),
    getMonthlyIncomeVsExpense(view),
    view === "business" ? getBusinessNetThisMonth() : Promise.resolve(null),
  ]);

  const entries: MoneyEntryRow[] = [
    ...expenses.map((e) => ({
      id: e.id,
      kind: "expense" as const,
      amount: Number(e.amount),
      label: e.category,
      type: e.type,
      note: e.note,
      date: e.date,
    })),
    ...income.map((i) => ({
      id: i.id,
      kind: "income" as const,
      amount: Number(i.amount),
      label: i.source,
      type: i.type,
      note: i.note,
      date: i.date,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, RECENT_LIMIT);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Life</h1>
        <p className="mt-1 text-neutral-400">Income, expenses, and monthly outgoings.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <QuickAddMoneyForm
          kind="expense"
          personalOptions={PERSONAL_EXPENSE_CATEGORIES}
          businessOptions={BUSINESS_EXPENSE_CATEGORIES}
          action={addExpense}
        />
        <QuickAddMoneyForm
          kind="income"
          personalOptions={PERSONAL_INCOME_SOURCES}
          businessOptions={BUSINESS_INCOME_SOURCES}
          action={addIncome}
        />
      </div>

      <div className="flex gap-2 border-b border-neutral-800">
        {VIEW_TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "all" ? "/dashboard/life" : `/dashboard/life?view=${t.value}`}
            className={`px-4 py-2 text-sm font-medium ${
              view === t.value
                ? "border-b-2 border-violet-500 text-neutral-50"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        <StatTile label="Spent today" value={formatCurrency(totals.spentToday)} />
        <StatTile label="Spent this week" value={formatCurrency(totals.spentWeek)} />
        <StatTile label="Spent this month" value={formatCurrency(totals.spentMonth)} />
        <StatTile
          label="Income today"
          value={formatCurrency(totals.incomeToday)}
          valueClassName="text-emerald-400"
        />
        <StatTile
          label="Income this week"
          value={formatCurrency(totals.incomeWeek)}
          valueClassName="text-emerald-400"
        />
        <StatTile
          label="Income this month"
          value={formatCurrency(totals.incomeMonth)}
          valueClassName="text-emerald-400"
        />
      </div>

      <div className={`grid gap-6 ${businessNet !== null ? "lg:grid-cols-3" : ""}`}>
        <div className={businessNet !== null ? "lg:col-span-2" : ""}>
          <IncomeVsExpenseChart data={monthlySeries} />
        </div>
        {businessNet !== null && (
          <div className="flex flex-col justify-center rounded-xl border border-cyan-500/20 bg-neutral-900/50 p-5">
            <p className="text-sm text-neutral-400">Business net this month</p>
            <p
              className={`mt-1 text-3xl font-semibold ${
                businessNet >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatCurrency(businessNet)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Etsy + other business income minus business costs</p>
          </div>
        )}
      </div>

      <CategoryBreakdownChart data={categoryBreakdown} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent entries</h2>
        <MoneyEntryTable entries={entries} />
      </div>
    </div>
  );
}
