import { db } from "@/lib/core/db";
import { MarketBreakdownWidget } from "@/components/trading/MarketBreakdownWidget";
import { getTodayNewYorkDateValue } from "@/lib/trading/calc";

export const dynamic = "force-dynamic";

export default async function TradingOverviewPage() {
  const todayDateValue = getTodayNewYorkDateValue();
  const latestPostToday = await db.marketBreakdownPost.findFirst({
    where: { tradingDate: new Date(`${todayDateValue}T00:00:00.000Z`) },
    orderBy: { postedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Market Update</h1>
        <p className="mt-1 text-neutral-400">NQ session bias and key levels, four times a day.</p>
      </div>
      <MarketBreakdownWidget post={latestPostToday} />
    </div>
  );
}
