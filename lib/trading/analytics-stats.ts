export interface AnalyticsTrade {
  outcome: string | null;
  rMultiple: number | null;
  entryTime: Date;
  entryModel: string | null;
  session: string;
  symbol: string | null;
  tagNames: string[];
}

export interface BreakdownRow {
  label: string;
  winRate: number;
  avgRR: number;
  count: number;
}

export interface CurvePoint {
  tradeIndex: number;
  date: string;
  cumulativeR: number;
}

export interface AnalyticsResult {
  winRate: number;
  profitFactor: number | null; // null = no losing R to divide by
  avgRR: number;
  netR: number;
  trades: number;
  streak: { count: number; type: "W" | "L" | "BE" } | null;
  curve: CurvePoint[];
  byConfluence: BreakdownRow[];
  byEntryModel: BreakdownRow[];
  bySession: BreakdownRow[];
  byPair: BreakdownRow[];
}

const SESSION_LABELS: Record<string, string> = {
  NEW_YORK_AM: "New York AM",
  NEW_YORK_PM: "New York PM",
  LONDON: "London",
  ASIA: "Asia",
  OTHER: "Other",
};

// R:R is stored as a positive number; Outcome decides whether it counts for
// (Win) or against (Loss) you. Breakeven contributes 0R.
function signedR(t: AnalyticsTrade): number {
  const r = Math.abs(t.rMultiple ?? 0);
  return t.outcome === "WIN" ? r : t.outcome === "LOSS" ? -r : 0;
}

function breakdown(trades: AnalyticsTrade[], keysFor: (t: AnalyticsTrade) => string[]): BreakdownRow[] {
  const groups = new Map<string, AnalyticsTrade[]>();
  for (const trade of trades) {
    for (const key of keysFor(trade)) {
      groups.set(key, [...(groups.get(key) ?? []), trade]);
    }
  }
  return Array.from(groups.entries())
    .map(([label, group]) => {
      const withR = group.filter((t) => t.rMultiple !== null);
      return {
        label,
        winRate: (group.filter((t) => t.outcome === "WIN").length / group.length) * 100,
        avgRR: withR.length > 0 ? withR.reduce((s, t) => s + Math.abs(t.rMultiple as number), 0) / withR.length : 0,
        count: group.length,
      };
    })
    .sort((a, b) => b.count - a.count || b.winRate - a.winRate);
}

export function computeAnalytics(input: AnalyticsTrade[]): AnalyticsResult {
  const trades = [...input].sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());
  const wins = trades.filter((t) => t.outcome === "WIN");
  const withR = trades.filter((t) => t.rMultiple !== null);

  const grossWin = trades.filter((t) => t.outcome === "WIN").reduce((s, t) => s + signedR(t), 0);
  const grossLoss = Math.abs(trades.filter((t) => t.outcome === "LOSS").reduce((s, t) => s + signedR(t), 0));

  let streak: AnalyticsResult["streak"] = null;
  if (trades.length > 0) {
    const kind = (t: AnalyticsTrade) => (t.outcome === "WIN" ? "W" : t.outcome === "LOSS" ? "L" : "BE");
    const latest = kind(trades[trades.length - 1]);
    let count = 0;
    for (let i = trades.length - 1; i >= 0 && kind(trades[i]) === latest; i--) count++;
    streak = { count, type: latest };
  }

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  let cumulative = 0;
  const curve = trades.map((t, index) => {
    cumulative += signedR(t);
    return { tradeIndex: index + 1, date: dateFormatter.format(t.entryTime), cumulativeR: cumulative };
  });

  return {
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? null : 0,
    avgRR: withR.length > 0 ? withR.reduce((s, t) => s + Math.abs(t.rMultiple as number), 0) / withR.length : 0,
    netR: trades.reduce((s, t) => s + signedR(t), 0),
    trades: trades.length,
    streak,
    curve,
    byConfluence: breakdown(trades, (t) => t.tagNames),
    byEntryModel: breakdown(trades, (t) => (t.entryModel ? [t.entryModel] : [])),
    bySession: breakdown(trades, (t) => [SESSION_LABELS[t.session] ?? t.session]),
    byPair: breakdown(trades, (t) => (t.symbol ? [t.symbol] : [])),
  };
}
