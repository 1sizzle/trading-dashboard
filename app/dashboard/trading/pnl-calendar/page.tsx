import Link from "next/link";
import { db } from "@/lib/core/db";
import { getNewYorkDateValue, getNewYorkDayRangeUtc, getTodayNewYorkDateValue } from "@/lib/trading/calc";

export const dynamic = "force-dynamic";

const ACCOUNTS = [
  { value: "LIVE", label: "Live" },
  { value: "EVAL", label: "Eval" },
  { value: "FUNDED", label: "Funded" },
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseMonth(value: string | undefined): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    return { year: Number(match[1]), month: Number(match[2]) };
  }
  const [year, month] = getTodayNewYorkDateValue().split("-").map(Number);
  return { year, month };
}

function monthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function parseAccounts(value: string | undefined): string[] {
  if (value === undefined) return ACCOUNTS.map((a) => a.value);
  if (value === "none") return [];
  return value.split(",").filter((v) => ACCOUNTS.some((a) => a.value === v));
}

function accountsParam(selected: string[]) {
  if (selected.length === ACCOUNTS.length) return "";
  return `&accounts=${selected.length === 0 ? "none" : selected.join(",")}`;
}

const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}R`;

function StatCard({ label, value, className = "text-neutral-50" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${className}`}>{value}</p>
    </div>
  );
}

const navButton =
  "rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-sm text-neutral-300 transition hover:border-violet-500/50 hover:text-neutral-50";

export default async function PnlCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; accounts?: string }>;
}) {
  const params = await searchParams;
  const { year, month } = parseMonth(params.month);
  const selected = parseAccounts(params.accounts);
  const allSelected = selected.length === ACCOUNTS.length;

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const first = `${monthValue(year, month)}-01`;
  const nextFirst = `${monthValue(next.year, next.month)}-01`;

  const trades =
    selected.length === 0
      ? []
      : await db.trade.findMany({
          where: {
            account: { in: selected as ("LIVE" | "EVAL" | "FUNDED")[] },
            entryTime: { gte: getNewYorkDayRangeUtc(first).start, lt: getNewYorkDayRangeUtc(nextFirst).start },
          },
          select: { entryTime: true, outcome: true, rMultiple: true },
        });

  const days = new Map<string, { netR: number; trades: number }>();
  for (const t of trades) {
    const key = getNewYorkDateValue(t.entryTime);
    const r = t.rMultiple !== null ? Math.abs(Number(t.rMultiple)) : 0;
    const delta = t.outcome === "WIN" ? r : t.outcome === "LOSS" ? -r : 0;
    const day = days.get(key) ?? { netR: 0, trades: 0 };
    day.netR += delta;
    day.trades += 1;
    days.set(key, day);
  }

  const monthNet = [...days.values()].reduce((sum, d) => sum + d.netR, 0);
  const greenDays = [...days.values()].filter((d) => d.netR > 0).length;
  const redDays = [...days.values()].filter((d) => d.netR < 0).length;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlanks = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = getTodayNewYorkDateValue();
  const monthHref = (m: { year: number; month: number }) =>
    `/dashboard/trading/pnl-calendar?month=${monthValue(m.year, m.month)}${accountsParam(selected)}`;
  const toggleHref = (value: string) => {
    const nextSelected = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    return `/dashboard/trading/pnl-calendar?month=${monthValue(year, month)}${accountsParam(nextSelected)}`;
  };
  const allHref = `/dashboard/trading/pnl-calendar?month=${monthValue(year, month)}${
    allSelected ? "&accounts=none" : ""
  }`;

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition ${
      active
        ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
        : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">PnL Calendar</h1>
        <p className="mt-1 text-neutral-400">Daily P&amp;L across whichever accounts you pick.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={monthHref(prev)} className={navButton}>
            ← Prev
          </Link>
          <span className="min-w-36 text-center text-lg">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Link href={monthHref(next)} className={navButton}>
            Next →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={allHref} className={pill(allSelected)}>
            All accounts
          </Link>
          {ACCOUNTS.map((a) => (
            <Link key={a.value} href={toggleHref(a.value)} className={pill(selected.includes(a.value) && !allSelected)}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Month net R" value={signed(monthNet)} className={monthNet < 0 ? "text-red-400" : "text-emerald-400"} />
        <StatCard label="Trades this month" value={String(trades.length)} />
        <StatCard label="Payouts this month" value="—" />
        <StatCard label="Green days" value={String(greenDays)} className="text-emerald-400" />
        <StatCard label="Red days" value={String(redDays)} className="text-red-400" />
      </div>

      {selected.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-sm text-neutral-500">
          No accounts selected — pick at least one above to see its calendar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <div className="grid min-w-[42rem] grid-cols-7 gap-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 pb-1 text-xs uppercase tracking-wider text-neutral-500">
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={`b${i}`} className="min-h-20 rounded-lg" />;
              const dateValue = `${monthValue(year, month)}-${String(day).padStart(2, "0")}`;
              const data = days.get(dateValue);
              const tone = !data || data.netR === 0
                ? "border-neutral-800 bg-neutral-900/40"
                : data.netR > 0
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-red-500/30 bg-red-500/10";
              return (
                <div
                  key={dateValue}
                  className={`min-h-20 rounded-lg border p-2 ${tone} ${
                    dateValue === today ? "ring-1 ring-violet-500" : ""
                  }`}
                >
                  <p className="text-xs text-neutral-500">{day}</p>
                  {data && (
                    <>
                      <p
                        className={`mt-1 font-mono text-sm font-semibold ${
                          data.netR > 0 ? "text-emerald-400" : data.netR < 0 ? "text-red-400" : "text-neutral-300"
                        }`}
                      >
                        {signed(data.netR)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {data.trades} trade{data.trades === 1 ? "" : "s"}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
