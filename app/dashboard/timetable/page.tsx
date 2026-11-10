import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { BlockForm } from "@/components/timetable/BlockForm";
import { CopyScriptButton } from "@/components/timetable/CopyScriptButton";
import { MonthCalendar } from "@/components/timetable/MonthCalendar";
import { WeekGrid } from "@/components/timetable/WeekGrid";
import { inputClass } from "@/components/ui/Field";
import { dateInputToUtcMidnight, utcMidnightToDateInputValue } from "@/lib/finances/dates";
import {
  BLOCK_COLORS,
  addDays,
  addMonths,
  formatDate,
  isDateString,
  isMonthString,
  mondayOf,
  nowInHomeZone,
  parseColor,
  weekdayOf,
} from "@/lib/timetable/constants";
import { buildWidgetScript } from "@/lib/timetable/widget-script";
import { addBlock } from "./actions";

export const dynamic = "force-dynamic";

const UPCOMING_LIMIT = 30;

function parseIntInRange(value: string | undefined, min: number, max: number): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");

function toGridBlock(block: {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  days: number[];
  date: Date | null;
  color: string;
  note: string | null;
}) {
  return { ...block, date: block.date ? utcMidnightToDateInputValue(block.date) : null };
}

const navLinkClass =
  "rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-900";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; week?: string; date?: string; hour?: string }>;
}) {
  const params = await searchParams;
  const now = nowInHomeZone();
  const thisWeek = mondayOf(now.date);
  // `week` may be any date (from the jump-to picker); snap it to its Monday.
  const weekStart = isDateString(params.week) ? mondayOf(params.week) : thisWeek;
  const weekEnd = addDays(weekStart, 6);
  // Set by clicking an empty box in the grid — prefills the Add form.
  const pickedDate = isDateString(params.date) ? params.date : undefined;
  const pickedHour = parseIntInRange(params.hour, 0, 23);
  const view = params.view === "month" ? "month" : "week";
  const thisMonth = now.date.slice(0, 7);
  const month = isMonthString(params.month) ? params.month : thisMonth;
  // The month grid shows whole weeks, so it can reach ~6 days either side.
  const rangeStart = view === "month" ? addDays(`${month}-01`, -7) : weekStart;
  const rangeEnd = view === "month" ? addDays(`${addMonths(month, 1)}-01`, 7) : weekEnd;

  const [rangeBlocks, upcoming] = await Promise.all([
    db.timetableBlock.findMany({
      where: {
        OR: [
          { date: null },
          { date: { gte: dateInputToUtcMidnight(rangeStart), lte: dateInputToUtcMidnight(rangeEnd) } },
        ],
      },
      orderBy: [{ startTime: "asc" }, { endTime: "asc" }],
    }),
    db.timetableBlock.findMany({
      where: { date: { gte: dateInputToUtcMidnight(now.date) } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: UPCOMING_LIMIT,
    }),
  ]);

  const token = process.env.TIMETABLE_WIDGET_TOKEN;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const script = token && host ? buildWidgetScript(`${protocol}://${host}/api/timetable`, token) : null;

  const weekHref = (week: string) => (week === thisWeek ? "/dashboard/timetable" : `/dashboard/timetable?week=${week}`);
  const monthHref = (m: string) => `/dashboard/timetable?view=month${m === thisMonth ? "" : `&month=${m}`}`;
  const monthLabel = formatDate(`${month}-01`, { month: "long", year: "numeric" });
  const weekLabel = `${formatDate(weekStart, { day: "numeric", month: "short" })} – ${formatDate(weekEnd, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Timetable</h1>
        <p className="mt-1 text-neutral-400">Your week and plans ahead — shown live on your iPhone lock screen.</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-neutral-800 text-sm font-medium">
            {(
              [
                { value: "week", label: "Week", href: weekHref(weekStart) },
                { value: "month", label: "Month", href: monthHref(weekStart.slice(0, 7)) },
              ] as const
            ).map((tab) => (
              <Link
                key={tab.value}
                href={tab.href}
                className={`px-3 py-1.5 transition ${
                  view === tab.value ? "bg-violet-600 text-white" : "text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {view === "month" ? (
            <>
              <Link href={monthHref(addMonths(month, -1))} className={navLinkClass} aria-label="Previous month">
                ←
              </Link>
              <Link href={monthHref(addMonths(month, 1))} className={navLinkClass} aria-label="Next month">
                →
              </Link>
              {month !== thisMonth && (
                <Link href={monthHref(thisMonth)} className={navLinkClass}>
                  Today
                </Link>
              )}
              <span className="px-1 text-lg font-semibold text-neutral-50">{monthLabel}</span>
              <form action="/dashboard/timetable" className="ml-auto flex items-center gap-2">
                <input type="hidden" name="view" value="month" />
                <input type="month" name="month" defaultValue={month} required className={`${inputClass} w-auto`} />
                <button type="submit" className={navLinkClass}>
                  Go
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href={weekHref(addDays(weekStart, -7))} className={navLinkClass} aria-label="Previous week">
                ←
              </Link>
              <Link href={weekHref(addDays(weekStart, 7))} className={navLinkClass} aria-label="Next week">
                →
              </Link>
              {weekStart !== thisWeek && (
                <Link href="/dashboard/timetable" className={navLinkClass}>
                  This week
                </Link>
              )}
              <span className="px-1 font-medium text-neutral-100">{weekLabel}</span>
              {/* Plain GET form: the page snaps whatever date is picked to its week. */}
              <form action="/dashboard/timetable" className="ml-auto flex items-center gap-2">
                <input type="date" name="week" defaultValue={weekStart} required className={`${inputClass} w-auto`} />
                <button type="submit" className={navLinkClass}>
                  Go
                </button>
              </form>
            </>
          )}
        </div>

        {view === "month" ? (
          <>
            <MonthCalendar month={month} blocks={rangeBlocks.map(toGridBlock)} today={now.date} />
            <p className="text-xs text-neutral-500">
              Click a day to plan something on it, or a plan to edit it. Your weekly routine is counted in the corner of
              each day — switch to Week to see it.
            </p>
          </>
        ) : (
          <>
            <WeekGrid blocks={rangeBlocks.map(toGridBlock)} weekStart={weekStart} today={now.date} />
            <p className="text-xs text-neutral-500">
              Click an empty box to add something at that time, or a block to edit or delete it. Dashed blocks are
              one-off plans.
            </p>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card accent>
          <div id="add" className="scroll-mt-4" />
          <h2 className="mb-4 text-lg font-semibold">
            Add block
            {pickedDate && (
              <span className="ml-2 text-sm font-normal text-violet-300">
                {formatDate(pickedDate, { weekday: "long", day: "numeric", month: "long" })}
                {pickedHour !== undefined && ` ${pad(pickedHour)}:00`}
              </span>
            )}
          </h2>
          {/* Keyed by the picked box so clicking another box resets the form to it. */}
          <BlockForm
            key={`${pickedDate}-${pickedHour}`}
            action={addBlock}
            defaultDay={pickedDate ? weekdayOf(pickedDate) : undefined}
            defaultDate={pickedDate ?? now.date}
            defaultStart={pickedHour !== undefined ? `${pad(pickedHour)}:00` : undefined}
            defaultEnd={
              pickedHour !== undefined
                ? `${pad(Math.min(pickedHour + 1, 23))}:${pickedHour === 23 ? "59" : "00"}`
                : undefined
            }
            submitLabel="Add"
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Coming up</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No one-off plans yet. Move to a future week and click a box, or pick &quot;One-off date&quot; in the form.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {upcoming.map((block) => {
                const date = utcMidnightToDateInputValue(block.date!);
                return (
                  <li key={block.id}>
                    <Link
                      href={`/dashboard/timetable/${block.id}/edit`}
                      className="flex items-baseline gap-3 py-2 text-sm transition hover:text-violet-200"
                    >
                      <span
                        className={`h-2 w-2 shrink-0 self-center rounded-full ${BLOCK_COLORS[parseColor(block.color)].bar}`}
                      />
                      <span className="w-28 shrink-0 text-neutral-400">
                        {date === now.date
                          ? "Today"
                          : formatDate(date, { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-neutral-500">
                        {block.startTime}–{block.endTime}
                      </span>
                      <span className="truncate text-neutral-100">{block.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold">Lock screen widget</h2>
          {script ? (
            <div className="mt-3 space-y-3 text-sm text-neutral-300">
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>
                  On your iPhone, install <span className="font-medium text-neutral-50">Scriptable</span> (free) from
                  the App Store.
                </li>
                <li>Open this page on your iPhone and tap the button below to copy the script.</li>
                <li>
                  In Scriptable, tap <span className="font-medium text-neutral-50">+</span>, paste, and name the script
                  &quot;Timetable&quot;. Tap ▶ to see a preview.
                </li>
                <li>
                  Long-press your lock screen → <span className="font-medium text-neutral-50">Customize</span> → Lock
                  Screen → tap the widget area → add <span className="font-medium text-neutral-50">Scriptable</span>{" "}
                  (the wide one).
                </li>
                <li>
                  Tap the new widget, set <span className="font-medium text-neutral-50">Script</span> to Timetable, then
                  Done.
                </li>
              </ol>
              <CopyScriptButton script={script} />
              <p className="text-xs text-neutral-500">
                The script contains your widget key, so don&apos;t share it. Changes you make here show on the widget
                within about 15 minutes — iOS decides exactly when widgets refresh.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-400">
              Set the <code className="text-neutral-200">TIMETABLE_WIDGET_TOKEN</code> environment variable to enable
              the widget.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
