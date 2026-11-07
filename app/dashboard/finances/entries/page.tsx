import Link from "next/link";
import { db } from "@/lib/core/db";
import { MoneyEntryTable, type MoneyEntryRow } from "@/components/finances/MoneyEntryTable";
import { Card } from "@/components/ui/Card";
import { parseView, type LifeView } from "@/lib/finances/aggregate";
import { formatCurrency } from "@/lib/finances/format";

export const dynamic = "force-dynamic";

const VIEW_TABS: { value: LifeView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
];

export default async function AllEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = parseView(params.view);
  const typeWhere = view === "all" ? {} : { type: view.toUpperCase() as "PERSONAL" | "BUSINESS" };

  const [expenses, income] = await Promise.all([
    db.expense.findMany({ where: typeWhere, orderBy: { date: "desc" } }),
    db.incomeEntry.findMany({ where: typeWhere, orderBy: { date: "desc" } }),
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
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalSpent = entries.filter((e) => e.kind === "expense").reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = entries.filter((e) => e.kind === "income").reduce((sum, e) => sum + e.amount, 0);
  const backHref = view === "all" ? "/dashboard/finances" : `/dashboard/finances?view=${view}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-neutral-400 hover:text-neutral-200">
          ← Back to finances
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">All entries</h1>
        <p className="mt-1 text-neutral-400">Every income and expense entry you&apos;ve logged.</p>
      </div>

      <div className="flex gap-2 border-b border-neutral-800">
        {VIEW_TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "all" ? "/dashboard/finances/entries" : `/dashboard/finances/entries?view=${t.value}`}
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

      <Card>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </h2>
          <p className="font-mono text-sm">
            <span className="text-emerald-400">+{formatCurrency(totalIncome)}</span>
            <span className="mx-2 text-neutral-600">/</span>
            <span className="text-red-400">-{formatCurrency(totalSpent)}</span>
          </p>
        </div>
        <MoneyEntryTable entries={entries} />
      </Card>
    </div>
  );
}
