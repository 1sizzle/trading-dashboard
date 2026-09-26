import Link from "next/link";
import { db } from "@/lib/core/db";
import { BreakdownCard } from "@/components/trading/BreakdownCard";
import { RCurveChart } from "@/components/trading/RCurveChart";
import {
  ANALYTICS_RANGES,
  getAnalyticsRangeStart,
  parseAnalyticsRange,
  type AnalyticsRange,
} from "@/lib/trading/analytics-range";
import { computeAnalytics } from "@/lib/trading/analytics-stats";

export const dynamic = "force-dynamic";

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

const RANGE_SUBTITLES: Record<AnalyticsRange, string> = {
  daily: "Every trade you've logged today.",
  weekly: "Every trade you've logged this week.",
  monthly: "Every trade you've logged this month.",
  yearly: "Every trade you've logged this year.",
  lifetime: "Every trade you've ever logged.",
};

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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${valueClassName || "text-neutral-50"}`}>{value}</p>
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const range = parseAnalyticsRange((await searchParams).range);
  const start = getAnalyticsRangeStart(range);

  const trades = await db.trade.findMany({
    where: start ? { entryTime: { gte: start } } : {},
    include: { tags: { include: { tag: true } } },
  });

  const result = computeAnalytics(
    trades.map((t) => ({
      outcome: t.outcome,
      rMultiple: t.rMultiple !== null ? Number(t.rMultiple) : null,
      entryTime: t.entryTime,
      entryModel: t.entryModel,
      session: t.session,
      symbol: t.symbol,
      tagNames: t.tags.map((tt) => tt.tag.name),
    })),
  );

  const hasTrades = result.trades > 0;
  const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}R`;
  const netClass = result.netR < 0 ? "text-red-400" : "text-emerald-400";
  const streakText = result.streak ? `${result.streak.count}${result.streak.type}` : "—";
  const streakClass =
    result.streak?.type === "W" ? "text-emerald-400" : result.streak?.type === "L" ? "text-red-400" : "text-neutral-50";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-1 text-neutral-400">{RANGE_SUBTITLES[range]}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-neutral-800 bg-neutral-900/50 p-1">
          {ANALYTICS_RANGES.map((r) => (
            <Link
              key={r}
              href={`/dashboard/trading/analytics?range=${r}`}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                r === range ? "bg-violet-600 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {RANGE_LABELS[r]}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Payouts to date" value="—" valueClassName="text-emerald-400" />
        <StatCard
          label="Win rate"
          value={`${result.winRate.toFixed(1)}%`}
          valueClassName={result.winRate >= 50 && hasTrades ? "text-emerald-400" : "text-red-400"}
        />
        <StatCard
          label="Profit factor"
          value={result.profitFactor === null ? "∞" : result.profitFactor.toFixed(2)}
          valueClassName={result.profitFactor === null || result.profitFactor >= 1 ? "text-emerald-400" : "text-red-400"}
        />
        <StatCard label="Avg R:R" value={signed(result.avgRR)} valueClassName="text-emerald-400" />
        <StatCard label="Net R" value={signed(result.netR)} valueClassName={netClass} />
        <StatCard label="Trades" value={String(result.trades)} />
        <StatCard label="Current streak" value={streakText} valueClassName={streakClass} />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <h2 className="text-xs uppercase tracking-wider text-neutral-500">Equity curve</h2>
        <p className="mt-2 text-xs text-neutral-400">Cumulative R across every logged trade</p>
        {hasTrades ? (
          <div className="mt-4">
            <RCurveChart data={result.curve} />
          </div>
        ) : (
          <p className="flex h-56 items-center justify-center text-sm text-neutral-500">
            No trades yet — the equity curve fills in as you log them.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Win rate by confluence" rows={result.byConfluence} />
        <BreakdownCard title="Win rate by entry model" rows={result.byEntryModel} />
        <BreakdownCard title="Win rate by session" rows={result.bySession} />
        <BreakdownCard title="Win rate by pair" rows={result.byPair} />
      </div>
    </div>
  );
}
