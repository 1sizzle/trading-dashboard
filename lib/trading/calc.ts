import { TradeDirection, TradingSession } from "@/lib/generated/prisma/client";

export function calculateFuturesMetalsPnl(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number,
  positionSize: number,
  pointValue: number,
): number {
  const priceMove = direction === "LONG" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return priceMove * positionSize * pointValue;
}

export function calculateFuturesMetalsRisk(
  entryPrice: number,
  stopLoss: number,
  positionSize: number,
  pointValue: number,
): number {
  return Math.abs(entryPrice - stopLoss) * positionSize * pointValue;
}

export function calculateRMultiple(pnl: number, riskDollars: number | null): number | null {
  if (!riskDollars || riskDollars === 0) return null;
  return pnl / riskDollars;
}

export function calculateDurationMinutes(entryTime: Date, exitTime: Date): number {
  return Math.round((exitTime.getTime() - entryTime.getTime()) / 60_000);
}

function getHourInTimeZone(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  });
  return Number(formatter.format(date));
}

function getTimeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
  const asUtcDigits = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtcDigits - instant.getTime()) / 60_000;
}

// Converts wall-clock date/time components in a given timezone to the
// correct UTC instant, handling DST automatically. This matters because the
// server (e.g. Vercel) runs in UTC: naively parsing a local time string
// server-side would silently treat it as UTC and corrupt session detection.
export function wallTimeComponentsToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(guessUtc), timeZone);
  return new Date(guessUtc - offsetMinutes * 60_000);
}

// Trade entry/exit times are always entered as New York (exchange) wall-clock
// time, matching Tradovate and futures-market convention — regardless of
// where the trader physically is when logging it.
export function newYorkWallTimeToUtc(dateTimeLocalValue: string): Date {
  const [datePart, timePart] = dateTimeLocalValue.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return wallTimeComponentsToUtc(year, month, day, hour, minute, 0, "America/New_York");
}

// Inverse of newYorkWallTimeToUtc — formats a stored UTC instant back into
// the "YYYY-MM-DDTHH:mm" shape a <input type="datetime-local"> expects,
// expressed in New York wall-clock time, for pre-filling the edit form.
export function utcToNewYorkDateTimeLocalValue(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// For display: always show trade times in New York time regardless of where
// the viewer physically is, so times stay consistent with how they were
// entered and with the session they were assigned to.
export function formatNewYorkDateTime(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  return `${formatted} ET`;
}

export function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getTodayNewYorkDateValue(): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Date-only values (e.g. a pre-market checklist's date) are stored as literal
// UTC midnight — they're a calendar-day label, not an event instant, so no
// timezone conversion is needed going in or out.
export function dateToDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// UTC instant range spanning one New York calendar day, for querying
// "today's trades" regardless of the server's own timezone.
export function getNewYorkDayRangeUtc(dateValue: string): { start: Date; end: Date } {
  const [year, month, day] = dateValue.split("-").map(Number);
  const start = wallTimeComponentsToUtc(year, month, day, 0, 0, 0, "America/New_York");
  const nextDayUtc = new Date(Date.UTC(year, month - 1, day + 1));
  const end = wallTimeComponentsToUtc(
    nextDayUtc.getUTCFullYear(),
    nextDayUtc.getUTCMonth() + 1,
    nextDayUtc.getUTCDate(),
    0,
    0,
    0,
    "America/New_York",
  );
  return { start, end };
}

export function shiftDateValue(dateValue: string, days: number): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", dateStyle: "medium" }).format(date);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

// Checked in this priority order because trading-session windows overlap
// (e.g. London/NY overlap for a few hours) — NY is checked first since
// that's the session this dashboard is built around.
export function detectSession(entryTime: Date): TradingSession {
  const nyHour = getHourInTimeZone(entryTime, "America/New_York");
  if (nyHour >= 9 && nyHour < 16) return "NEW_YORK";

  const londonHour = getHourInTimeZone(entryTime, "Europe/London");
  if (londonHour >= 8 && londonHour < 16) return "LONDON";

  const tokyoHour = getHourInTimeZone(entryTime, "Asia/Tokyo");
  if (tokyoHour >= 9 && tokyoHour < 15) return "ASIA";

  return "OTHER";
}
