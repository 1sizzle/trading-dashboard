import { db } from "@/lib/core/db";
import { WorstBestCallout } from "@/components/trading/WorstBestCallout";
import { SetupInsightsList } from "@/components/trading/SetupInsightsList";
import { groupPnlByDayOfWeek, groupPnlByTag, groupPnlByTimeWindow } from "@/lib/trading/analytics";
import { rankBuckets } from "@/lib/trading/insights";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const trades = await db.trade.findMany({
    include: { tags: { include: { tag: true } } },
  });

  const normalized = trades.map((trade) => ({
    pnl: Number(trade.pnl),
    entryTime: trade.entryTime,
    tags: trade.tags,
  }));

  const byDay = rankBuckets(groupPnlByDayOfWeek(normalized));
  const byTime = rankBuckets(groupPnlByTimeWindow(normalized));
  const byTag = rankBuckets(groupPnlByTag(normalized));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="mt-1 text-neutral-400">
          Plain-English takeaways from your trade history. The more you log, the more these mean.
        </p>
      </div>

      <WorstBestCallout title="Day of week" ranked={byDay} />
      <WorstBestCallout title="Time of day" ranked={byTime} />
      <SetupInsightsList ranked={byTag} />
    </div>
  );
}
