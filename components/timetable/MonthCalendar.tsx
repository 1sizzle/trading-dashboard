import Link from "next/link";
import type { GridBlock } from "@/components/timetable/WeekGrid";
import { BLOCK_COLORS, WEEKDAYS, addDays, mondayOf, parseColor, weekdayOf } from "@/lib/timetable/constants";

const MAX_CHIPS = 3;

// A month of days, Monday first, padded with the neighbouring months' days
// so every row is a full week. One-off plans show as chips on their date;
// the weekly routine is only counted, since it would repeat in every cell.
export function MonthCalendar({ month, blocks, today }: { month: string; blocks: GridBlock[]; today: string }) {
  const first = `${month}-01`;
  const gridStart = mondayOf(first);
  const nextMonthFirst = addDays(first, 32).slice(0, 7) + "-01";
  const gridEnd = addDays(mondayOf(addDays(nextMonthFirst, -1)), 6);
  const dayCount = Math.round((Date.parse(gridEnd) - Date.parse(gridStart)) / 86_400_000) + 1;
  const dates = Array.from({ length: dayCount }, (_, i) => addDays(gridStart, i));

  const weekly = blocks.filter((b) => !b.date);
  const oneOffsByDate = new Map<string, GridBlock[]>();
  for (const b of blocks) {
    if (!b.date) continue;
    oneOffsByDate.set(b.date, [...(oneOffsByDate.get(b.date) ?? []), b]);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/30">
      <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-900">
        {WEEKDAYS.map((d) => (
          <div
            key={d.value}
            className={`py-2 text-center text-xs font-medium tracking-wider uppercase ${
              d.value === 0 || d.value === 6 ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            <span className="sm:hidden">{d.short.slice(0, 1)}</span>
            <span className="hidden sm:inline">{d.short}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dates.map((date, i) => {
          const weekday = weekdayOf(date);
          const inMonth = date.startsWith(month);
          const isToday = date === today;
          const isPast = date < today;
          const isWeekend = weekday === 0 || weekday === 6;
          const plans = oneOffsByDate.get(date) ?? [];
          const routineCount = weekly.filter((b) => b.days.includes(weekday)).length;

          return (
            <div
              key={date}
              className={`group relative min-h-24 border-neutral-800 p-1.5 sm:min-h-28 sm:p-2 ${
                i % 7 !== 0 ? "border-l" : ""
              } ${i >= 7 ? "border-t" : ""} ${isWeekend && inMonth ? "bg-neutral-900/50" : ""} ${
                isToday ? "bg-violet-500/10" : ""
              }`}
            >
              {/* The whole cell opens that week with the Add form set to this date. */}
              <Link
                href={`/dashboard/timetable?week=${date}&date=${date}#add`}
                aria-label={`Plan something on ${date}`}
                className="absolute inset-0 transition group-hover:bg-neutral-800/30"
              />

              <div className="relative flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? "bg-violet-600 text-white shadow-[0_0_12px] shadow-violet-500/50"
                      : inMonth
                        ? isPast
                          ? "text-neutral-500"
                          : "text-neutral-200"
                        : "text-neutral-700"
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                <span className="text-xs text-violet-300 opacity-0 transition group-hover:opacity-100">+</span>
              </div>

              <div className={`relative mt-1 space-y-1 ${inMonth ? "" : "opacity-40"}`}>
                {plans.slice(0, MAX_CHIPS).map((b) => {
                  const color = BLOCK_COLORS[parseColor(b.color)].hex;
                  return (
                    <Link
                      key={b.id}
                      href={`/dashboard/timetable/${b.id}/edit`}
                      title={`${b.startTime}–${b.endTime} ${b.title}${b.note ? ` — ${b.note}` : ""}`}
                      className="block truncate rounded-md py-0.5 pr-1.5 pl-2 text-[11px] leading-tight font-medium text-neutral-100 transition hover:brightness-125"
                      style={{ backgroundColor: `${color}26`, boxShadow: `inset 2px 0 0 ${color}` }}
                    >
                      <span className="mr-1 hidden font-mono text-[10px] font-normal text-neutral-400 sm:inline">
                        {b.startTime}
                      </span>
                      {b.title}
                    </Link>
                  );
                })}
                {plans.length > MAX_CHIPS && (
                  <p className="px-1.5 text-[11px] text-neutral-400">+{plans.length - MAX_CHIPS} more</p>
                )}
              </div>

              {routineCount > 0 && inMonth && (
                <p className="pointer-events-none absolute right-2 bottom-1.5 hidden text-[10px] text-neutral-600 sm:block">
                  {routineCount} routine
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
