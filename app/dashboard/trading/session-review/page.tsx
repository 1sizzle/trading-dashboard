import Link from "next/link";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { PremarketChecklistCard } from "@/components/trading/PremarketChecklistCard";
import { SessionSummary } from "@/components/trading/SessionSummary";
import { SessionTradeTable } from "@/components/trading/SessionTradeTable";
import {
  formatDateOnly,
  getNewYorkDayRangeUtc,
  getTodayNewYorkDateValue,
  shiftDateValue,
} from "@/lib/trading/calc";
import { summarizeTrades } from "@/lib/trading/analytics";

export const dynamic = "force-dynamic";

export default async function SessionReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const dateValue = params.date ?? getTodayNewYorkDateValue();
  const { start, end } = getNewYorkDayRangeUtc(dateValue);

  const [trades, checklist] = await Promise.all([
    db.trade.findMany({
      where: { entryTime: { gte: start, lt: end }, session: "NEW_YORK" },
      orderBy: { entryTime: "asc" },
      include: { tags: { include: { tag: true } } },
    }),
    db.premarketChecklist.findFirst({
      where: { date: new Date(`${dateValue}T00:00:00.000Z`) },
    }),
  ]);

  const summary = summarizeTrades(
    trades.map((trade) => ({
      pnl: Number(trade.pnl),
      rMultiple: trade.rMultiple !== null ? Number(trade.rMultiple) : null,
    })),
  );

  const prevDate = shiftDateValue(dateValue, -1);
  const nextDate = shiftDateValue(dateValue, 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Session Review</h1>
        <p className="mt-1 text-neutral-400">
          Your New York session trades for a day, reviewed together.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-400">Reviewing</p>
            <p className="text-lg font-semibold">{formatDateOnly(new Date(`${dateValue}T00:00:00.000Z`))}</p>
          </div>
          <div className="flex items-end gap-3">
            <Link
              href={`/dashboard/trading/session-review?date=${prevDate}`}
              className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              Previous day
            </Link>
            <form action="/dashboard/trading/session-review" method="get" className="flex items-end gap-2">
              <Field label="Jump to date">
                <input type="date" name="date" defaultValue={dateValue} className={inputClass} />
              </Field>
              <button
                type="submit"
                className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                Go
              </button>
            </form>
            <Link
              href={`/dashboard/trading/session-review?date=${nextDate}`}
              className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              Next day
            </Link>
          </div>
        </div>
      </Card>

      {checklist ? (
        <PremarketChecklistCard checklist={checklist} />
      ) : (
        <p className="text-sm text-neutral-500">No pre-market checklist logged for this date.</p>
      )}

      <SessionSummary summary={summary} />

      <SessionTradeTable trades={trades} />
    </div>
  );
}
