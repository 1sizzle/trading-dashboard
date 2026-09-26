import { getNewYorkDayRangeUtc, getTodayNewYorkDateValue, shiftDateValue } from "@/lib/trading/calc";

export const ANALYTICS_RANGES = ["daily", "weekly", "monthly", "yearly", "lifetime"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export function parseAnalyticsRange(value: string | undefined): AnalyticsRange {
  return (ANALYTICS_RANGES as readonly string[]).includes(value ?? "")
    ? (value as AnalyticsRange)
    : "lifetime";
}

// Start of the selected period in New York time (weeks run Monday–Sunday);
// null means no lower bound (lifetime).
export function getAnalyticsRangeStart(range: AnalyticsRange): Date | null {
  if (range === "lifetime") return null;

  const today = getTodayNewYorkDateValue();
  const [year, month, day] = today.split("-").map(Number);

  let startDate = today;
  if (range === "weekly") {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
    startDate = shiftDateValue(today, weekday === 0 ? -6 : 1 - weekday);
  } else if (range === "monthly") {
    startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  } else if (range === "yearly") {
    startDate = `${year}-01-01`;
  }

  return getNewYorkDayRangeUtc(startDate).start;
}
