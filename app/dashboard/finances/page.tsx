import Link from "next/link";
import { db } from "@/lib/core/db";
import { QuickAddMoneyForm } from "@/components/finances/QuickAddMoneyForm";
import { MoneyEntryTable, type MoneyEntryRow } from "@/components/finances/MoneyEntryTable";
import { CategoryBreakdownChart } from "@/components/finances/CategoryBreakdownChart";
import { IncomeVsExpenseChart } from "@/components/finances/IncomeVsExpenseChart";
import { SubscriptionsCard } from "@/components/finances/SubscriptionsCard";
import { Card } from "@/components/ui/Card";
import {
  PERSONAL_EXPENSE_CATEGORIES,
  BUSINESS_EXPENSE_CATEGORIES,
  PERSONAL_INCOME_SOURCES,
  BUSINESS_INCOME_SOURCES,
  PERSONAL_SUBSCRIPTION_CATEGORIES,
  BUSINESS_SUBSCRIPTION_CATEGORIES,
} from "@/lib/finances/categories";
import {
  parseView,
  getPeriodTotals,
  getExpenseCategoryBreakdown,
  getMonthlyIncomeVsExpense,
  getBusinessNetThisMonth,
  getExpenseCategoryOptions,
  getIncomeSourceOptions,
  getSubscriptionCategoryOptions,
  type LifeView,
} from "@/lib/finances/aggregate";
import { formatCurrency } from "@/lib/finances/format";
import { addExpense, addIncome, addSubscription, deleteSubscription } from "./actions";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 20;

const VIEW_TABS: { value: LifeView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
];

function StatCard({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold text-neutral-50 ${valueClassName}`}>{value}</p>
    </div>
  );
}

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = parseView(params.view);
  const typeWhere = view === "all" ? {} : { type: view.toUpperCase() as "PERSONAL" | "BUSINESS" };

  const [
    expenses,
    income,
    subscriptions,
    totals,
    categoryBreakdown,
    monthlySeries,
    businessNet,
    expenseCategoryOptions,
    incomeSourceOptions,
    subscriptionCategoryOptions,
  ] = await Promise.all([
    db.expense.findMany({ where: typeWhere, orderBy: { date: "desc" }, take: RECENT_LIMIT }),
    db.incomeEntry.findMany({ where: typeWhere, orderBy: { date: "desc" }, take: RECENT_LIMIT }),
    db.subscription.findMany({ orderBy: { name: "asc" } }),
    getPeriodTotals(view),
    getExpenseCategoryBreakdown(view),
    getMonthlyIncomeVsExpense(view),
    view === "business" ? getBusinessNetThisMonth() : Promise.resolve(null),
    getExpenseCategoryOptions(PERSONAL_EXPENSE_CATEGORIES, BUSINESS_EXPENSE_CATEGORIES),
    getIncomeSourceOptions(PERSONAL_INCOME_SOURCES, BUSINESS_INCOME_SOURCES),
    getSubscriptionCategoryOptions(PERSONAL_SUBSCRIPTION_CATEGORIES, BUSINESS_SUBSCRIPTION_CATEGORIES),
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

  const subscriptionRows = subscriptions.map((s) => ({
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    cycle: s.cycle,
    type: s.type,
    category: s.category,
    nextBillingDate: s.nextBillingDate,
    note: s.note,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Finances</h1>
        <p className="mt-1 text-neutral-400">Income, expenses, and monthly outgoings.</p>
      </div>

      <QuickAddMoneyForm
        expenseOptions={expenseCategoryOptions}
        incomeOptions={incomeSourceOptions}
        addExpense={addExpense}
        addIncome={addIncome}
      />

      <div className="flex gap-2 border-b border-neutral-800">
        {VIEW_TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "all" ? "/dashboard/finances" : `/dashboard/finances?view=${t.value}`}
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Spent today" value={formatCurrency(totals.spentToday)} valueClassName="text-red-400" />
        <StatCard label="Spent this week" value={formatCurrency(totals.spentWeek)} valueClassName="text-red-400" />
        <StatCard label="Spent this month" value={formatCurrency(totals.spentMonth)} valueClassName="text-red-400" />
        <StatCard
          label="Income today"
          value={formatCurrency(totals.incomeToday)}
          valueClassName="text-emerald-400"
        />
        <StatCard
          label="Income this week"
          value={formatCurrency(totals.incomeWeek)}
          valueClassName="text-emerald-400"
        />
        <StatCard
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

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Recent entries</h2>
        <MoneyEntryTable entries={entries} />
      </Card>

      <SubscriptionsCard
        subscriptions={subscriptionRows}
        personalCategories={subscriptionCategoryOptions.personal}
        businessCategories={subscriptionCategoryOptions.business}
        addSubscription={addSubscription}
        deleteSubscription={deleteSubscription}
      />
    </div>
  );
}
