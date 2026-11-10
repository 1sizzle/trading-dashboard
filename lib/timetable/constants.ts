// Weekdays in display order (Monday first). `value` matches JS Date#getDay,
// which is what TimetableBlock.days stores and the widget compares against.
export const WEEKDAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 0, short: "Sun", label: "Sunday" },
] as const;

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];
export const WEEKENDS_ONLY = [0, 6];

// `hex` is used by the Scriptable home-screen widget; `bar` by the dashboard.
export const BLOCK_COLORS = {
  violet: { label: "Violet", hex: "#8b5cf6", bar: "bg-violet-500" },
  cyan: { label: "Cyan", hex: "#06b6d4", bar: "bg-cyan-500" },
  emerald: { label: "Green", hex: "#10b981", bar: "bg-emerald-500" },
  amber: { label: "Amber", hex: "#f59e0b", bar: "bg-amber-500" },
  rose: { label: "Rose", hex: "#f43f5e", bar: "bg-rose-500" },
  neutral: { label: "Grey", hex: "#a3a3a3", bar: "bg-neutral-400" },
} as const;

export type BlockColor = keyof typeof BLOCK_COLORS;

export function parseColor(value: unknown): BlockColor {
  return typeof value === "string" && value in BLOCK_COLORS ? (value as BlockColor) : "violet";
}

// The dashboard is used from the UK; this only picks which day tab opens by
// default and which block is highlighted as "now". The widget itself uses
// the phone's own clock.
export const HOME_TIME_ZONE = "Europe/London";

export function nowInHomeZone(date = new Date()): { day: number; minutes: number; date: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HOME_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: HOME_TIME_ZONE }).format(date);
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")), date: ymd };
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function describeDays(days: number[]): string {
  const set = new Set(days);
  if (set.size === 7) return "Every day";
  if (set.size === 5 && WEEKDAYS_ONLY.every((d) => set.has(d))) return "Weekdays";
  if (set.size === 2 && WEEKENDS_ONLY.every((d) => set.has(d))) return "Weekends";
  return WEEKDAYS.filter((d) => set.has(d.value))
    .map((d) => d.short)
    .join(", ");
}

// Calendar-date helpers for one-off blocks. Dates are "YYYY-MM-DD" strings;
// arithmetic goes through UTC midnight so it never crosses a DST boundary.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function mondayOf(date: string): string {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

// Months are "YYYY-MM" strings.
export function isMonthString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 7);
}

export function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
