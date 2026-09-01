export interface TradeSummary {
  count: number;
  wins: number;
  losses: number;
  winRate: number | null;
  totalPnl: number;
  avgRMultiple: number | null;
}

export function summarizeTrades(trades: { pnl: number; rMultiple: number | null }[]): TradeSummary {
  const count = trades.length;
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate = count > 0 ? (wins / count) * 100 : null;

  const rMultiples = trades.map((t) => t.rMultiple).filter((r): r is number => r !== null);
  const avgRMultiple =
    rMultiples.length > 0 ? rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length : null;

  return { count, wins, losses, winRate, totalPnl, avgRMultiple };
}

export interface PnlBucket {
  label: string;
  pnl: number;
  count: number;
}

function toBucketList(map: Map<string, { pnl: number; count: number }>): PnlBucket[] {
  return Array.from(map.entries()).map(([label, v]) => ({ label, pnl: v.pnl, count: v.count }));
}

function addToBucket(map: Map<string, { pnl: number; count: number }>, key: string, pnl: number) {
  const existing = map.get(key) ?? { pnl: 0, count: 0 };
  existing.pnl += pnl;
  existing.count += 1;
  map.set(key, existing);
}

// Tags are the only categorization that exists on a Trade, so they stand in
// for "setup type" here — labeled honestly as tags, not setups.
export function groupPnlByTag(
  trades: { pnl: number; tags: { tag: { name: string } }[] }[],
): PnlBucket[] {
  const map = new Map<string, { pnl: number; count: number }>();
  for (const trade of trades) {
    for (const { tag } of trade.tags) {
      addToBucket(map, tag.name, trade.pnl);
    }
  }
  return toBucketList(map).sort((a, b) => b.pnl - a.pnl);
}

const SESSION_ORDER = ["NEW_YORK", "LONDON", "ASIA", "OTHER"];
const SESSION_LABELS: Record<string, string> = {
  NEW_YORK: "New York",
  LONDON: "London",
  ASIA: "Asia",
  OTHER: "Other",
};

export function groupPnlBySession(trades: { pnl: number; session: string }[]): PnlBucket[] {
  const map = new Map<string, { pnl: number; count: number }>();
  for (const trade of trades) {
    addToBucket(map, trade.session, trade.pnl);
  }
  return SESSION_ORDER.filter((session) => map.has(session)).map((session) => ({
    label: SESSION_LABELS[session],
    pnl: map.get(session)!.pnl,
    count: map.get(session)!.count,
  }));
}

const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function groupPnlByDayOfWeek(trades: { pnl: number; entryTime: Date }[]): PnlBucket[] {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  });
  const map = new Map<string, { pnl: number; count: number }>();
  for (const trade of trades) {
    addToBucket(map, formatter.format(trade.entryTime), trade.pnl);
  }
  return DAY_ORDER.filter((day) => map.has(day)).map((day) => ({
    label: day,
    pnl: map.get(day)!.pnl,
    count: map.get(day)!.count,
  }));
}

// Named day-trading windows in New York time, covering the full 24h since
// futures trade well outside NYSE cash hours. Boundaries are minutes since
// midnight; "Overnight" wraps past midnight. Retune here if these don't match
// how you actually think about your trading day.
const TIME_WINDOWS: { label: string; start: number; end: number }[] = [
  { label: "Pre-Market", start: 4 * 60, end: 9 * 60 + 30 },
  { label: "Open", start: 9 * 60 + 30, end: 10 * 60 + 30 },
  { label: "Morning", start: 10 * 60 + 30, end: 12 * 60 },
  { label: "Midday", start: 12 * 60, end: 13 * 60 + 30 },
  { label: "Afternoon", start: 13 * 60 + 30, end: 15 * 60 },
  { label: "Power Hour", start: 15 * 60, end: 16 * 60 },
  { label: "After-Hours", start: 16 * 60, end: 20 * 60 },
  { label: "Overnight", start: 20 * 60, end: 24 * 60 + 4 * 60 }, // wraps past midnight
];
const TIME_WINDOW_ORDER = TIME_WINDOWS.map((w) => w.label);

function getNewYorkMinutesOfDay(date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function classifyTimeWindow(minutesOfDay: number): string {
  for (const window of TIME_WINDOWS) {
    if (minutesOfDay >= window.start && minutesOfDay < window.end) return window.label;
    // Overnight wraps: also match the early-morning portion (0:00–4:00).
    if (window.end > 24 * 60 && minutesOfDay < window.end - 24 * 60) return window.label;
  }
  return "Overnight";
}

export function groupPnlByTimeWindow(trades: { pnl: number; entryTime: Date }[]): PnlBucket[] {
  const map = new Map<string, { pnl: number; count: number }>();
  for (const trade of trades) {
    const window = classifyTimeWindow(getNewYorkMinutesOfDay(trade.entryTime));
    addToBucket(map, window, trade.pnl);
  }
  return TIME_WINDOW_ORDER.filter((label) => map.has(label)).map((label) => ({
    label,
    pnl: map.get(label)!.pnl,
    count: map.get(label)!.count,
  }));
}

export interface EquityPoint {
  tradeIndex: number;
  date: string;
  cumulativePnl: number;
}

export function buildEquityCurve(trades: { pnl: number; entryTime: Date }[]): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  });

  let cumulative = 0;
  return sorted.map((trade, index) => {
    cumulative += trade.pnl;
    return { tradeIndex: index + 1, date: formatter.format(trade.entryTime), cumulativePnl: cumulative };
  });
}
