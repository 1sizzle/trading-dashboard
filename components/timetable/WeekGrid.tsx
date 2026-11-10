import Link from "next/link";
import { NowLine } from "@/components/timetable/NowLine";
import { BLOCK_COLORS, addDays, formatDate, parseColor, timeToMinutes, weekdayOf } from "@/lib/timetable/constants";

export type GridBlock = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  days: number[];
  date: string | null; // "YYYY-MM-DD" for one-off blocks, null for weekly ones
  color: string;
  note: string | null;
};

const HOUR_HEIGHT = 48; // px per hour row
const DEFAULT_FIRST_HOUR = 6;
const DEFAULT_LAST_HOUR = 23;

// Gives each block a lane so overlapping blocks in the same day sit side by
// side instead of on top of each other. `lanes` is the widest overlap within
// the block's cluster, so every block in a cluster shares the same width.
function layoutDay(blocks: GridBlock[]) {
  const sorted = [...blocks].sort(
    (a, b) =>
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime) || timeToMinutes(a.endTime) - timeToMinutes(b.endTime),
  );
  const placed: { block: GridBlock; lane: number; lanes: number }[] = [];
  let cluster: typeof placed = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];

  const closeCluster = () => {
    const lanes = laneEnds.length;
    cluster.forEach((p) => (p.lanes = lanes));
    cluster = [];
    laneEnds = [];
  };

  for (const block of sorted) {
    const start = timeToMinutes(block.startTime);
    const end = timeToMinutes(block.endTime);
    if (start >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    const entry = { block, lane, lanes: 1 };
    placed.push(entry);
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, end);
  }
  closeCluster();
  return placed;
}

const COLUMNS = "grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]";

// One week (Monday first) of real dates. Weekly blocks show on their
// weekdays; one-off blocks only on their own date, with a dashed outline.
export function WeekGrid({ blocks, weekStart, today }: { blocks: GridBlock[]; weekStart: string; today: string }) {
  const columns = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const weekday = weekdayOf(date);
    return {
      date,
      label: formatDate(date, { weekday: "short", day: "numeric", month: "short" }),
      longLabel: formatDate(date, { weekday: "long", day: "numeric", month: "long" }),
      blocks: blocks.filter((b) => (b.date ? b.date === date : b.days.includes(weekday))),
    };
  });
  const shown = columns.flatMap((c) => c.blocks);

  // Show 06:00–23:00 by default, stretched to fit any earlier/later blocks.
  const firstHour = Math.min(DEFAULT_FIRST_HOUR, ...shown.map((b) => Math.floor(timeToMinutes(b.startTime) / 60)));
  const lastHour = Math.max(DEFAULT_LAST_HOUR, ...shown.map((b) => Math.ceil(timeToMinutes(b.endTime) / 60)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const top = (minutes: number) => ((minutes - firstHour * 60) / 60) * HOUR_HEIGHT;

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <div className="min-w-[760px]">
        <div className={`${COLUMNS} sticky top-0 border-b border-neutral-800 bg-neutral-900`}>
          <div />
          {columns.map((c) => (
            <div
              key={c.date}
              className={`border-l border-neutral-800 py-2 text-center text-sm font-medium ${
                c.date === today ? "bg-violet-500/15 text-violet-200" : "text-neutral-300"
              }`}
            >
              {c.label}
            </div>
          ))}
        </div>

        <div className={COLUMNS}>
          <div>
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="border-b border-neutral-800 pt-1 pr-2 text-right font-mono text-xs text-neutral-500"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {columns.map((c) => {
            return (
              <div
                key={c.date}
                className={`relative border-l border-neutral-800 ${c.date === today ? "bg-violet-500/5" : ""}`}
              >
                {/* Empty hour cells — click one to start adding a block there. */}
                {hours.map((hour) => (
                  <Link
                    key={hour}
                    href={`/dashboard/timetable?week=${weekStart}&date=${c.date}&hour=${hour}#add`}
                    aria-label={`Add a block on ${c.longLabel} at ${String(hour).padStart(2, "0")}:00`}
                    style={{ height: HOUR_HEIGHT }}
                    className="block border-b border-neutral-800 transition hover:bg-neutral-800/40"
                  />
                ))}

                {layoutDay(c.blocks).map(({ block, lane, lanes }) => {
                  const start = timeToMinutes(block.startTime);
                  const end = timeToMinutes(block.endTime);
                  const height = top(end) - top(start);
                  const color = BLOCK_COLORS[parseColor(block.color)].hex;
                  return (
                    <Link
                      key={block.id}
                      href={`/dashboard/timetable/${block.id}/edit`}
                      title={`${block.startTime}–${block.endTime} ${block.title}${block.note ? ` — ${block.note}` : ""}`}
                      className="absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 transition hover:brightness-125"
                      style={{
                        top: top(start) + 2,
                        height: Math.max(height - 4, 16),
                        left: `calc(${(lane / lanes) * 100}% + 3px)`,
                        width: `calc(${100 / lanes}% - 6px)`,
                        backgroundColor: `${color}33`,
                        borderColor: `${color}99`,
                        borderStyle: block.date ? "dashed" : "solid",
                      }}
                    >
                      <p className="truncate text-xs leading-tight font-semibold text-neutral-50">{block.title}</p>
                      {height >= 34 && (
                        <p className="truncate font-mono text-[10px] leading-tight text-neutral-300">
                          {block.startTime}–{block.endTime}
                        </p>
                      )}
                    </Link>
                  );
                })}

                {c.date === today && <NowLine firstHour={firstHour} lastHour={lastHour} hourHeight={HOUR_HEIGHT} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
