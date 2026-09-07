import Link from "next/link";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, secondaryButtonClass } from "@/components/ui/Field";
import { MarketBreakdownPostCard } from "@/components/trading/MarketBreakdownPostCard";
import { formatDateOnly, getTodayNewYorkDateValue, shiftDateValue } from "@/lib/trading/calc";

export const dynamic = "force-dynamic";

export default async function MarketBreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const dateValue = params.date ?? getTodayNewYorkDateValue();

  // tradingDate is a calendar-day label stored as literal UTC midnight (same
  // convention as PremarketChecklist.date), not an event instant — so this is
  // an exact match, not a getNewYorkDayRangeUtc-style range query.
  const posts = await db.marketBreakdownPost.findMany({
    where: { tradingDate: new Date(`${dateValue}T00:00:00.000Z`) },
    orderBy: { postedAt: "asc" },
  });

  const prevDate = shiftDateValue(dateValue, -1);
  const nextDate = shiftDateValue(dateValue, 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Market Breakdown</h1>
        <p className="mt-1 text-neutral-400">
          NQ session bias and key levels, computed from your own TradingView data — not scraped from anywhere.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-400">Viewing</p>
            <p className="text-lg font-semibold">{formatDateOnly(new Date(`${dateValue}T00:00:00.000Z`))}</p>
          </div>
          <div className="flex items-end gap-3">
            <Link href={`/dashboard/trading/market-breakdown?date=${prevDate}`} className={secondaryButtonClass}>
              Previous day
            </Link>
            <form action="/dashboard/trading/market-breakdown" method="get" className="flex items-end gap-2">
              <Field label="Jump to date">
                <input type="date" name="date" defaultValue={dateValue} className={inputClass} />
              </Field>
              <button type="submit" className={secondaryButtonClass}>
                Go
              </button>
            </form>
            <Link href={`/dashboard/trading/market-breakdown?date=${nextDate}`} className={secondaryButtonClass}>
              Next day
            </Link>
          </div>
        </div>
      </Card>

      {posts.length === 0 ? (
        <p className="text-sm text-neutral-500">No market breakdown posts logged for this date yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <MarketBreakdownPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
