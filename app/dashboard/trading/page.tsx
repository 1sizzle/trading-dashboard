import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function TradingOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Trading</h1>
      <p className="mt-2 text-neutral-400">A live signals feed is coming next.</p>
      <div className="mt-6 grid max-w-sm gap-4">
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
      </div>
    </div>
  );
}
