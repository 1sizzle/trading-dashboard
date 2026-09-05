import Link from "next/link";
import { db } from "@/lib/core/db";
import { SessionSummary } from "@/components/trading/SessionSummary";
import { EquityCurveChart } from "@/components/trading/EquityCurveChart";
import { PnlBreakdownChart } from "@/components/trading/PnlBreakdownChart";
import {
  buildEquityCurve,
  groupPnlByDayOfWeek,
  groupPnlBySession,
  groupPnlByTag,
  summarizeTrades,
} from "@/lib/trading/analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: "futures" | "crypto" = params.tab === "crypto" ? "crypto" : "futures";

  const trades = await db.trade.findMany({
    where: { assetClass: tab === "crypto" ? "CRYPTO" : "FUTURES_METALS" },
    orderBy: { entryTime: "asc" },
    include: { tags: { include: { tag: true } } },
  });

  const normalized = trades.map((trade) => ({
    pnl: Number(trade.pnl),
    rMultiple: trade.rMultiple !== null ? Number(trade.rMultiple) : null,
    session: trade.session,
    entryTime: trade.entryTime,
    tags: trade.tags,
  }));

  const summary = summarizeTrades(normalized);
  const byTag = groupPnlByTag(normalized);
  const bySession = groupPnlBySession(normalized);
  const byDayOfWeek = groupPnlByDayOfWeek(normalized);
  const equityCurve = buildEquityCurve(normalized);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Performance Analytics</h1>
        <p className="mt-1 text-neutral-400">
          {tab === "crypto"
            ? "Crypto trades only (Bitunix)."
            : "Futures & Metals trades only (prop firm)."}
        </p>
      </div>

      <div className="flex gap-2 border-b border-neutral-800">
        <Link
          href="/dashboard/trading/analytics?tab=futures"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "futures"
              ? "border-b-2 border-violet-500 text-neutral-50"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Futures & Metals
        </Link>
        <Link
          href="/dashboard/trading/analytics?tab=crypto"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "crypto"
              ? "border-b-2 border-violet-500 text-neutral-50"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Crypto
        </Link>
      </div>

      <SessionSummary summary={summary} />

      <EquityCurveChart data={equityCurve} />

      <PnlBreakdownChart
        title="P&L by tag"
        hint="Tags are the closest thing to a setup type here — doubles as that breakdown."
        data={byTag}
      />
      {tab === "futures" && <PnlBreakdownChart title="P&L by session" data={bySession} />}
      <PnlBreakdownChart
        title="P&L by day of week"
        hint="Each bar sums every trade that ever fell on that weekday across your whole history — not a single date."
        data={byDayOfWeek}
      />
    </div>
  );
}
