// NQ / ES futures prices for the trading mentor, from Yahoo Finance's public chart
// endpoint (unofficial, free, ~10 minutes delayed for CME). Everything here works in
// New York time. A "trade date" starts at 18:00 New York the evening before (the
// futures daily open), so Sunday 18:00 belongs to Monday's trade date.

export type MentorSymbol = "NQ" | "ES";

const YAHOO_SYMBOL: Record<MentorSymbol, string> = { NQ: "NQ=F", ES: "ES=F" };
const DAY_MS = 24 * 60 * 60 * 1000;

export interface Bar {
  t: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}

export class MarketDataError extends Error {}

async function fetchChart(symbol: MentorSymbol, interval: "1m" | "5m" | "60m", from: Date, to: Date): Promise<Bar[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(YAHOO_SYMBOL[symbol])}` +
    `?interval=${interval}&period1=${Math.floor(from.getTime() / 1000)}&period2=${Math.floor(to.getTime() / 1000)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  if (!res.ok) {
    throw new MarketDataError(`Price feed returned ${res.status} for ${symbol} ${interval}`);
  }
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const timestamps: number[] | undefined = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];
  if (!timestamps || !quote) {
    return [];
  }
  const bars: Bar[] = [];
  timestamps.forEach((ts, i) => {
    const [open, high, low, close] = [quote.open[i], quote.high[i], quote.low[i], quote.close[i]];
    if ([open, high, low, close].every((v) => typeof v === "number")) {
      bars.push({ t: new Date(ts * 1000), open, high, low, close });
    }
  });
  return bars;
}

// Yahoo keeps 1m bars for about a week and 5m bars for about two months.
async function fetchIntraday(symbol: MentorSymbol, from: Date, to: Date): Promise<{ bars: Bar[]; tf: 1 | 5 }> {
  const ageDays = (Date.now() - from.getTime()) / DAY_MS;
  if (ageDays < 7) {
    return { bars: await fetchChart(symbol, "1m", from, to), tf: 1 };
  }
  if (ageDays < 58) {
    return { bars: await fetchChart(symbol, "5m", from, to), tf: 5 };
  }
  throw new MarketDataError("Intraday bars are only available for about the last two months.");
}

const nyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function nyParts(t: Date): { date: string; time: string } {
  const p = Object.fromEntries(nyFormatter.formatToParts(t).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function tradeDate(t: Date): string {
  return nyParts(new Date(t.getTime() + 6 * 60 * 60 * 1000)).date;
}

function shiftDate(dateValue: string, days: number): string {
  const [y, m, d] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekday(dateValue: string): number {
  const [y, m, d] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
}

// A UTC instant safely before 18:00 NY on the evening before `dateValue` (covers DST).
function utcBefore(dateValue: string, days: number): Date {
  return new Date(`${shiftDate(dateValue, -days)}T12:00:00Z`);
}

function inWindow(time: string, start: string, end: string): boolean {
  return start <= end ? time >= start && time < end : time >= start || time < end; // wraps midnight
}

function highLow(bars: Bar[]) {
  if (bars.length === 0) return null;
  const high = Math.max(...bars.map((b) => b.high));
  const low = Math.min(...bars.map((b) => b.low));
  return { high, low, eq: round((high + low) / 2) };
}

const round = (v: number) => Math.round(v * 100) / 100;

function resample(bars: Bar[], minutes: number): Bar[] {
  const out: Bar[] = [];
  const bucketMs = minutes * 60 * 1000;
  for (const b of bars) {
    const key = Math.floor(b.t.getTime() / bucketMs) * bucketMs;
    const last = out[out.length - 1];
    if (last && last.t.getTime() === key) {
      last.high = Math.max(last.high, b.high);
      last.low = Math.min(last.low, b.low);
      last.close = b.close;
    } else {
      out.push({ ...b, t: new Date(key) });
    }
  }
  return out;
}

export const SESSIONS: Record<string, [string, string]> = {
  Asia: ["18:00", "00:00"],
  London: ["02:00", "05:00"],
  "NY AM": ["09:30", "12:00"],
  "Initial Balance": ["09:30", "10:30"],
  "NY PM": ["13:30", "16:00"],
};

export async function getLevels(symbol: MentorSymbol, dateValue?: string) {
  const d = dateValue ?? tradeDate(new Date());
  const monthStart = `${d.slice(0, 8)}01`;
  const prevMonthStart = shiftDate(monthStart, -1).slice(0, 8) + "01";
  const yearStart = `${d.slice(0, 4)}-01-01`;
  const historyFrom = utcBefore(yearStart < prevMonthStart ? yearStart : prevMonthStart, 3);
  const dayEnd = new Date(`${shiftDate(d, 1)}T12:00:00Z`);

  const [hourly, intraday] = await Promise.all([
    fetchChart(symbol, "60m", historyFrom, dayEnd),
    fetchIntraday(symbol, utcBefore(d, 2), dayEnd),
  ]);
  if (hourly.length === 0) {
    throw new MarketDataError("No price data returned.");
  }

  const hourlyTd = hourly.map((b) => ({ b, td: tradeDate(b.t) }));
  const today = intraday.bars.filter((b) => tradeDate(b.t) === d);
  // The calendar-day part of the trade date (after midnight), not the evening before.
  const daytime = today.filter((b) => nyParts(b.t).date === d);
  const firstOpen = (bars: Bar[]) => (bars.length ? bars[0].open : null);

  const pastDays = [...new Set(hourlyTd.filter((x) => x.td < d).map((x) => x.td))].sort();
  const prevDay = pastDays[pastDays.length - 1];
  const weekStart = shiftDate(d, -((weekday(d) + 6) % 7)); // Monday trade date (opens Sunday 18:00)
  const hoursBetween = (from: string, to: string) => hourlyTd.filter((x) => x.td >= from && x.td < to).map((x) => x.b);

  const last = intraday.bars[intraday.bars.length - 1] ?? hourly[hourly.length - 1];
  const sessions: Record<string, ReturnType<typeof highLow>> = {};
  for (const [name, [start, end]] of Object.entries(SESSIONS)) {
    sessions[name] = highLow(today.filter((b) => inWindow(nyParts(b.t).time, start, end)));
  }

  return {
    symbol,
    tradeDate: d,
    source: "Yahoo Finance futures data, about 10 minutes delayed",
    lastBar: { timeNY: `${nyParts(last.t).date} ${nyParts(last.t).time}`, close: last.close },
    opens: {
      yearly: firstOpen(hourlyTd.filter((x) => x.td >= yearStart).map((x) => x.b)),
      monthly: firstOpen(hourlyTd.filter((x) => x.td >= monthStart).map((x) => x.b)),
      weekly: firstOpen(hourlyTd.filter((x) => x.td >= weekStart).map((x) => x.b)),
      daily_18_00: firstOpen(today),
      midnight: firstOpen(daytime),
      "09_30": firstOpen(daytime.filter((b) => nyParts(b.t).time >= "09:30")),
      "10_00": firstOpen(daytime.filter((b) => nyParts(b.t).time >= "10:00")),
    },
    previous: {
      day: prevDay ? { tradeDate: prevDay, ...highLow(hoursBetween(prevDay, d)) } : null,
      week: highLow(hoursBetween(shiftDate(weekStart, -7), weekStart)),
      month: highLow(hoursBetween(prevMonthStart, monthStart)),
    },
    sessions,
    daySoFar: highLow(today),
  };
}

export async function getBars(
  symbol: MentorSymbol,
  dateValue: string,
  start: string,
  end: string,
  tf: number,
) {
  const { bars, tf: sourceTf } = await fetchIntraday(
    symbol,
    utcBefore(dateValue, 1),
    new Date(`${shiftDate(dateValue, 1)}T12:00:00Z`),
  );
  const window = bars.filter((b) => tradeDate(b.t) === dateValue && inWindow(nyParts(b.t).time, start, end));
  const step = Math.max(tf, sourceTf);
  const rows = resample(window, step).map((b) => ({
    timeNY: nyParts(b.t).time,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }));
  return {
    symbol,
    tradeDate: dateValue,
    timeframeMinutes: step,
    note:
      step > tf
        ? `Only ${sourceTf}-minute bars are kept this far back, so these are ${step}-minute bars.`
        : undefined,
    bars: rows,
  };
}
