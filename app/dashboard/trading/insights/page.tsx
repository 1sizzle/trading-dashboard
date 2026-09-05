import Link from "next/link";
import { db } from "@/lib/core/db";
import { WorstBestCallout } from "@/components/trading/WorstBestCallout";
import { SetupInsightsList } from "@/components/trading/SetupInsightsList";
import { InsightsChatPanel } from "@/components/trading/InsightsChatPanel";
import { groupPnlByDayOfWeek, groupPnlByTag, groupPnlByTimeWindow } from "@/lib/trading/analytics";
import { rankBuckets } from "@/lib/trading/insights";

export const dynamic = "force-dynamic";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: "futures" | "crypto" = params.tab === "crypto" ? "crypto" : "futures";

  const trades = await db.trade.findMany({
    where: { assetClass: tab === "crypto" ? "CRYPTO" : "FUTURES_METALS" },
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

      <div className="flex gap-2 border-b border-neutral-800">
        <Link
          href="/dashboard/trading/insights?tab=futures"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "futures"
              ? "border-b-2 border-violet-500 text-neutral-50"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Futures & Metals
        </Link>
        <Link
          href="/dashboard/trading/insights?tab=crypto"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "crypto"
              ? "border-b-2 border-violet-500 text-neutral-50"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Crypto
        </Link>
      </div>

      {tab === "futures" && <InsightsChatPanel tradeCount={trades.length} />}

      <WorstBestCallout title="Day of week" ranked={byDay} />
      <WorstBestCallout title="Time of day" ranked={byTime} />
      <SetupInsightsList ranked={byTag} />
    </div>
  );
}
