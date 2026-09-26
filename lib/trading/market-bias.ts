export const BIAS_SESSIONS = [
  { value: "ASIA", label: "Asia" },
  { value: "LONDON", label: "London" },
  { value: "NEW_YORK", label: "New York" },
] as const;

export const BIAS_DIRECTIONS = [
  { value: "BULLISH", label: "Bullish" },
  { value: "BEARISH", label: "Bearish" },
  { value: "NEUTRAL", label: "Neutral" },
] as const;

export interface BiasRow {
  date: string; // YYYY-MM-DD
  session: string;
  bias: string;
  points: number;
}

export interface SessionSummary {
  bullish: number;
  bearish: number;
  neutral: number;
  netPoints: number;
  days: number;
}

export function summarizeSession(rows: BiasRow[], session: string): SessionSummary {
  const mine = rows.filter((r) => r.session === session);
  return {
    bullish: mine.filter((r) => r.bias === "BULLISH").length,
    bearish: mine.filter((r) => r.bias === "BEARISH").length,
    neutral: mine.filter((r) => r.bias === "NEUTRAL").length,
    netPoints: mine.reduce((sum, r) => sum + r.points, 0),
    days: mine.length,
  };
}

export interface CorrelationResult {
  matchingDays: number; // days the trigger session moved that way by at least the threshold
  withReaction: number; // of those, days the reacting session was also logged
  bullish: number;
  bearish: number;
  neutral: number;
  avgPoints: number;
}

// "When <trigger> pumps/dumps by >= threshold points, how does <reaction> behave that same day?"
export function analyzeCorrelation(
  rows: BiasRow[],
  trigger: string,
  direction: "pump" | "dump",
  threshold: number,
  reaction: string,
): CorrelationResult {
  const byDay = new Map<string, Map<string, BiasRow>>();
  for (const r of rows) {
    const day = byDay.get(r.date) ?? new Map<string, BiasRow>();
    day.set(r.session, r);
    byDay.set(r.date, day);
  }

  const result: CorrelationResult = { matchingDays: 0, withReaction: 0, bullish: 0, bearish: 0, neutral: 0, avgPoints: 0 };
  let pointsTotal = 0;
  for (const day of byDay.values()) {
    const t = day.get(trigger);
    if (!t) continue;
    const hit = direction === "pump" ? t.points >= threshold : t.points <= -threshold;
    if (!hit) continue;
    result.matchingDays += 1;
    const r = day.get(reaction);
    if (!r) continue;
    result.withReaction += 1;
    pointsTotal += r.points;
    if (r.bias === "BULLISH") result.bullish += 1;
    else if (r.bias === "BEARISH") result.bearish += 1;
    else result.neutral += 1;
  }
  result.avgPoints = result.withReaction > 0 ? pointsTotal / result.withReaction : 0;
  return result;
}
