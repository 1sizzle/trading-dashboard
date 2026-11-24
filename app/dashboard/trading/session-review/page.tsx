import Link from "next/link";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, secondaryButtonClass } from "@/components/ui/Field";
import { DailyReviewCard } from "@/components/trading/DailyReviewCard";
import { WeeklyReviewCard } from "@/components/trading/WeeklyReviewCard";
import { MentorCard } from "@/components/trading/MentorCard";
import { PremarketChecklistCard } from "@/components/trading/PremarketChecklistCard";
import { SessionSummary } from "@/components/trading/SessionSummary";
import { SessionTradeTable } from "@/components/trading/SessionTradeTable";
import {
  formatDateOnly,
  getNewYorkDayRangeUtc,
  getNewYorkWeekRangeUtc,
  getNewYorkWeekStartDateValue,
  getTodayNewYorkDateValue,
  shiftDateValue,
} from "@/lib/trading/calc";
import { summarizeTrades } from "@/lib/trading/analytics";
import {
  generateDailyCommentary,
  generateWeeklyCommentary,
  saveDailyReflection,
  saveWeeklyReflection,
} from "./actions";

export const dynamic = "force-dynamic";

const BASE = "/dashboard/trading/session-review";

async function DayView({ dateValue, aiError }: { dateValue: string; aiError: boolean }) {
  const { start, end } = getNewYorkDayRangeUtc(dateValue);

  const [trades, checklist, review] = await Promise.all([
    db.trade.findMany({
      where: { entryTime: { gte: start, lt: end } },
      orderBy: { entryTime: "asc" },
      include: { tags: { include: { tag: true } } },
    }),
    db.premarketChecklist.findFirst({
      where: { date: new Date(`${dateValue}T00:00:00.000Z`) },
    }),
    db.dailyReview.findUnique({
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
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-400">Reviewing</p>
            <p className="text-lg font-semibold">{formatDateOnly(new Date(`${dateValue}T00:00:00.000Z`))}</p>
          </div>
          <div className="flex items-end gap-3">
            <Link href={`${BASE}?view=day&date=${prevDate}`} className={secondaryButtonClass}>
              Previous day
            </Link>
            <form action={BASE} method="get" className="flex items-end gap-2">
              <input type="hidden" name="view" value="day" />
              <Field label="Jump to date">
                <input type="date" name="date" defaultValue={dateValue} className={inputClass} />
              </Field>
              <button type="submit" className={secondaryButtonClass}>
                Go
              </button>
            </form>
            <Link href={`${BASE}?view=day&date=${nextDate}`} className={secondaryButtonClass}>
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

      <DailyReviewCard
        dateValue={dateValue}
        review={review}
        aiError={aiError}
        saveReflection={saveDailyReflection}
        generateCommentary={generateDailyCommentary}
      />

      {review?.mentorReview && <MentorCard title="Mentor review" markdown={review.mentorReview} />}
    </div>
  );
}

async function WeekView({ anchorDate, aiError }: { anchorDate: string; aiError: boolean }) {
  const weekStartValue = getNewYorkWeekStartDateValue(anchorDate);
  const weekEndValue = shiftDateValue(weekStartValue, 6);
  const { start, end } = getNewYorkWeekRangeUtc(weekStartValue);

  const [trades, review, dailyReviews, patterns] = await Promise.all([
    db.trade.findMany({
      where: { entryTime: { gte: start, lt: end } },
      orderBy: { entryTime: "asc" },
    }),
    db.weeklyReview.findUnique({
      where: { weekStart: new Date(`${weekStartValue}T00:00:00.000Z`) },
    }),
    db.dailyReview.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    }),
    db.mentorMemory.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);

  const summary = summarizeTrades(
    trades.map((trade) => ({
      pnl: Number(trade.pnl),
      rMultiple: trade.rMultiple !== null ? Number(trade.rMultiple) : null,
    })),
  );

  const prevWeek = shiftDateValue(weekStartValue, -7);
  const nextWeek = shiftDateValue(weekStartValue, 7);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-400">Reviewing</p>
            <p className="text-lg font-semibold">
              {formatDateOnly(new Date(`${weekStartValue}T00:00:00.000Z`))} –{" "}
              {formatDateOnly(new Date(`${weekEndValue}T00:00:00.000Z`))}
            </p>
          </div>
          <div className="flex items-end gap-3">
            <Link href={`${BASE}?view=week&date=${prevWeek}`} className={secondaryButtonClass}>
              Previous week
            </Link>
            <form action={BASE} method="get" className="flex items-end gap-2">
              <input type="hidden" name="view" value="week" />
              <Field label="Jump to date">
                <input type="date" name="date" defaultValue={weekStartValue} className={inputClass} />
              </Field>
              <button type="submit" className={secondaryButtonClass}>
                Go
              </button>
            </form>
            <Link href={`${BASE}?view=week&date=${nextWeek}`} className={secondaryButtonClass}>
              Next week
            </Link>
          </div>
        </div>
      </Card>

      <SessionSummary summary={summary} />

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Day by day</h2>
        {dailyReviews.length === 0 ? (
          <p className="text-sm text-neutral-500">No daily reviews logged this week yet.</p>
        ) : (
          <ul className="space-y-2">
            {dailyReviews.map((d) => {
              const dateValue = d.date.toISOString().slice(0, 10);
              return (
                <li key={d.id} className="flex items-start gap-3 text-sm">
                  <Link
                    href={`${BASE}?view=day&date=${dateValue}`}
                    className="shrink-0 font-medium text-violet-400 hover:text-violet-300"
                  >
                    {formatDateOnly(d.date)}
                  </Link>
                  <span className="text-neutral-400">
                    {d.reflection ? d.reflection : <span className="text-neutral-600">No reflection written</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <WeeklyReviewCard
        weekStartValue={weekStartValue}
        review={review}
        aiError={aiError}
        saveReflection={saveWeeklyReflection}
        generateCommentary={generateWeeklyCommentary}
      />

      {review?.mentorReview && <MentorCard title="Mentor review" markdown={review.mentorReview} />}
      {patterns && <MentorCard title="Mentor's notes on your patterns" markdown={patterns.content} />}
    </div>
  );
}

export default async function SessionReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; aiError?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "day";
  const dateValue = params.date ?? getTodayNewYorkDateValue();
  const aiError = params.aiError === "1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Review</h1>
        <p className="mt-1 text-neutral-400">
          Your trades (every session, New York calendar days), reviewed day by day or rolled up for the week.
        </p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-neutral-800 p-1">
        <Link
          href={`${BASE}?view=day&date=${dateValue}`}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            view === "day" ? "bg-violet-600 text-white" : "text-neutral-400 hover:bg-neutral-900"
          }`}
        >
          Day
        </Link>
        <Link
          href={`${BASE}?view=week&date=${dateValue}`}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            view === "week" ? "bg-violet-600 text-white" : "text-neutral-400 hover:bg-neutral-900"
          }`}
        >
          Week
        </Link>
      </div>

      {view === "day" ? (
        <DayView dateValue={dateValue} aiError={aiError} />
      ) : (
        <WeekView anchorDate={dateValue} aiError={aiError} />
      )}
    </div>
  );
}
