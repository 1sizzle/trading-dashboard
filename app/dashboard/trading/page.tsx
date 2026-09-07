import Link from "next/link";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
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
    <div>
      <h1 className="text-2xl font-semibold">Trading</h1>
      <p className="mt-2 text-neutral-400">A live signals feed is coming next.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="grid gap-4">
          <Link href="/dashboard/trading/journal">
            <Card className="transition hover:border-violet-500/50">
              <h2 className="font-medium">Journal</h2>
              <p className="mt-1 text-sm text-neutral-400">Log and review your trades.</p>
            </Card>
          </Link>
          <Link href="/dashboard/trading/playbook">
            <Card className="transition hover:border-violet-500/50">
              <h2 className="font-medium">Playbook</h2>
              <p className="mt-1 text-sm text-neutral-400">Your trading rules and setup grades.</p>
            </Card>
          </Link>
          <Link href="/dashboard/trading/premarket">
            <Card className="transition hover:border-violet-500/50">
              <h2 className="font-medium">Pre-Market Checklist</h2>
              <p className="mt-1 text-sm text-neutral-400">Log bias and key levels before the session.</p>
            </Card>
          </Link>
          <Link href="/dashboard/trading/risk">
            <Card className="transition hover:border-violet-500/50">
              <h2 className="font-medium">Risk Tracker</h2>
              <p className="mt-1 text-sm text-neutral-400">Daily loss limit and position size calculator.</p>
            </Card>
          </Link>
          <Link href="/dashboard/trading/session-review">
            <Card className="transition hover:border-violet-500/50">
              <h2 className="font-medium">Session Review</h2>
              <p className="mt-1 text-sm text-neutral-400">Review a day&apos;s New York session trades.</p>
            </Card>
          </Link>
          <Link href="/dashboard/trading/analytics">
            <Card className="transition hover:border-violet-500/50">
              <h2 className="font-medium">Analytics</h2>
              <p className="mt-1 text-sm text-neutral-400">Win rate, P&amp;L breakdowns, and equity curve.</p>
            </Card>
          </Link>
          <Link href="/dashboard/trading/insights">
            <Card className="transition hover:border-violet-500/50">
              <h2 className="font-medium">Insights</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Worst/best days, times, and setups — in plain English.
              </p>
            </Card>
          </Link>
          <Link href="/dashboard/trading/gallery">
            <Card className="transition hover:border-violet-500/50">
              <h2 className="font-medium">Screenshot Gallery</h2>
              <p className="mt-1 text-sm text-neutral-400">Browse every chart screenshot you&apos;ve saved.</p>
            </Card>
          </Link>
          <Link href="/dashboard/trading/market-breakdown">
            <Card className="transition hover:border-violet-500/50">
              <h2 className="font-medium">Market Breakdown</h2>
              <p className="mt-1 text-sm text-neutral-400">NQ session bias and key levels, 4x daily.</p>
            </Card>
          </Link>
        </div>
        <MarketBreakdownWidget post={latestPostToday} />
      </div>
    </div>
  );
}
