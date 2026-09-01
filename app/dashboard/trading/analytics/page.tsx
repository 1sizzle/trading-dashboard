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

export default async function AnalyticsPage() {
  const trades = await db.trade.findMany({
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
          Across all trades — futures/metals and crypto combined.
        </p>
      </div>

      <SessionSummary summary={summary} />

      <EquityCurveChart data={equityCurve} />

      <PnlBreakdownChart
        title="P&L by tag"
        hint="Tags are the closest thing to a setup type here — doubles as that breakdown."
        data={byTag}
      />
      <PnlBreakdownChart title="P&L by session" data={bySession} />
      <PnlBreakdownChart title="P&L by day of week" data={byDayOfWeek} />
    </div>
  );
}
