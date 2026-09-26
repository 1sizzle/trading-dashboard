import Link from "next/link";
import { db } from "@/lib/core/db";
import { getNewYorkDateValue, getNewYorkDayRangeUtc, getTodayNewYorkDateValue } from "@/lib/trading/calc";
import { syncNewsIfStale } from "@/lib/trading/news-sync";
import { syncNews } from "./actions";

export const dynamic = "force-dynamic";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MAX_CHIPS = 3;

function parseMonth(value: string | undefined): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    return { year: Number(match[1]), month: Number(match[2]) };
  }
  const [year, month] = getTodayNewYorkDateValue().split("-").map(Number);
  return { year, month };
}

const monthValue = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const formatTime = (d: Date) => timeFormat.format(d).replace(" ", "").toLowerCase();

const IMPACT_CHIP = {
  HIGH: "bg-red-500/15 text-red-300",
  MEDIUM: "bg-amber-500/15 text-amber-300",
} as const;

const IMPACT_BADGE = {
  HIGH: "border-red-500/30 bg-red-500/10 text-red-300",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-300",
} as const;

const navButton =
  "rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-300 transition hover:border-violet-500/50 hover:text-neutral-50";

function StatCard({ label, value, className = "text-neutral-50" }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${className}`}>{value}</p>
    </div>
  );
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; cur?: string; day?: string; synced?: string; syncError?: string }>;
}) {
  const params = await searchParams;

  // Best-effort auto refresh — a failure just leaves whatever was synced before.
  await syncNewsIfStale().catch(() => undefined);

  const { year, month } = parseMonth(params.month);
  const currencies = (params.cur ?? "").split(",").filter((c) => CURRENCIES.includes(c));
  const day = /^\d{4}-\d{2}-\d{2}$/.test(params.day ?? "") ? params.day! : null;

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const first = `${monthValue(year, month)}-01`;
  const nextFirst = `${monthValue(next.year, next.month)}-01`;

  const events = await db.newsEvent.findMany({
    where: {
      eventTime: { gte: getNewYorkDayRangeUtc(first).start, lt: getNewYorkDayRangeUtc(nextFirst).start },
      ...(currencies.length > 0 ? { currency: { in: currencies } } : {}),
    },
    orderBy: { eventTime: "asc" },
  });

  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const key = getNewYorkDateValue(e.eventTime);
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }

  const high = events.filter((e) => e.impact === "HIGH").length;
  const medium = events.length - high;
  const tableEvents = day ? (byDay.get(day) ?? []) : events;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  const startCell = new Date(Date.UTC(year, month - 1, 1 - leading));
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startCell.getTime() + i * 86400000);
    cells.push({
      date: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month - 1,
    });
  }

  const today = getTodayNewYorkDateValue();
  const href = (opts: { month?: string; cur?: string[]; day?: string | null }) => {
    const q = new URLSearchParams();
    q.set("month", opts.month ?? monthValue(year, month));
    const cur = opts.cur ?? currencies;
    if (cur.length > 0) q.set("cur", cur.join(","));
    if (opts.day) q.set("day", opts.day);
    return `/dashboard/trading/news?${q.toString()}`;
  };
  const toggleCurrency = (c: string) =>
    href({ cur: currencies.includes(c) ? currencies.filter((x) => x !== c) : [...currencies, c], day });

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition ${
      active
        ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
        : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">News</h1>
          <p className="mt-1 text-neutral-400">
            Red and orange folder economic events, synced from ForexFactory&apos;s calendar.
          </p>
        </div>
        <form action={syncNews} className="flex items-center gap-3">
          <input type="hidden" name="back" value={href({ day })} />
          {params.synced && <span className="text-xs text-emerald-400">Synced {params.synced} events</span>}
          {params.syncError && <span className="text-xs text-red-400">Couldn&apos;t reach the calendar — try again</span>}
          <button type="submit" className={navButton}>
            Sync now
          </button>
        </form>
      </div>

      <div className="flex items-center gap-3">
        <Link href={href({ month: monthValue(prev.year, prev.month), day: null })} className={navButton}>
          ← Prev
        </Link>
        <span className="min-w-36 text-center text-lg">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <Link href={href({ month: monthValue(next.year, next.month), day: null })} className={navButton}>
          Next →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={href({ cur: [], day })} className={pill(currencies.length === 0)}>
          All assets
        </Link>
        {CURRENCIES.map((c) => (
          <Link key={c} href={toggleCurrency(c)} className={pill(currencies.includes(c))}>
            {c}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="High impact this month" value={high} className="text-red-400" />
        <StatCard label="Medium impact this month" value={medium} className="text-amber-400" />
        <StatCard label="Total events this month" value={events.length} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
        <div className="grid min-w-[52rem] grid-cols-7 gap-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 pb-1 text-center text-xs uppercase tracking-wider text-neutral-500">
              {d}
            </div>
          ))}
          {cells.map((cell) => {
            const dayEvents = cell.inMonth ? (byDay.get(cell.date) ?? []) : [];
            const shown = dayEvents.slice(0, MAX_CHIPS);
            const isSelected = day === cell.date;
            return (
              <Link
                key={cell.date}
                href={href({ day: isSelected ? null : cell.date })}
                className={`block min-h-24 rounded-lg border p-2 transition ${
                  cell.inMonth ? "border-neutral-800 bg-neutral-900/40 hover:border-violet-500/40" : "border-transparent opacity-30"
                } ${isSelected ? "border-violet-500" : ""} ${cell.date === today ? "ring-1 ring-violet-500" : ""}`}
              >
                <p className={`text-xs ${cell.date === today ? "font-semibold text-violet-300" : "text-neutral-500"}`}>
                  {cell.day}
                </p>
                <div className="mt-1 space-y-1">
                  {shown.map((e) => (
                    <p key={e.id} className={`truncate rounded px-1.5 py-0.5 text-[11px] ${IMPACT_CHIP[e.impact]}`}>
                      {e.title}
                    </p>
                  ))}
                  {dayEvents.length > MAX_CHIPS && (
                    <p className="px-1 text-[11px] text-neutral-500">+{dayEvents.length - MAX_CHIPS} more</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 px-1 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" /> High impact
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Medium impact
          </span>
          <span>Click a day to see just that day&apos;s events below.</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-neutral-300">
          {day ? `Events on ${dayFormat.format(getNewYorkDayRangeUtc(day).start)}` : "Full forecast / previous detail for every event below — scroll if the list runs long."}
          {day && (
            <Link href={href({ day: null })} className="ml-3 text-xs text-violet-400 hover:text-violet-300">
              Show whole month
            </Link>
          )}
        </p>
        <div className="max-h-[32rem] overflow-auto rounded-xl border border-neutral-800 bg-neutral-900/30">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 bg-neutral-950">
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time (NY)</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Impact</th>
                <th className="px-4 py-3 font-medium">Forecast</th>
                <th className="px-4 py-3 font-medium">Previous</th>
              </tr>
            </thead>
            <tbody>
              {tableEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                    {day
                      ? "No red or orange events on this day."
                      : "No events synced for this period. ForexFactory only publishes the current week, so months fill in as weeks get synced."}
                  </td>
                </tr>
              ) : (
                tableEvents.map((e) => (
                  <tr key={e.id} className="border-b border-neutral-900 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-neutral-300">{dayFormat.format(e.eventTime)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-neutral-300">{formatTime(e.eventTime)}</td>
                    <td className="px-4 py-2.5 text-neutral-300">{e.currency}</td>
                    <td className="px-4 py-2.5 font-medium">{e.title}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${IMPACT_BADGE[e.impact]}`}>
                        {e.impact === "HIGH" ? "High" : "Medium"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-neutral-300">{e.forecast ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-neutral-300">{e.previous ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
