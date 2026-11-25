import type { TradeDirection, TradeOutcome } from "@/lib/generated/prisma/client";
import { getPointValue, KNOWN_FUTURES_SYMBOLS } from "@/lib/trading/contracts";

// Maths for trades the mentor logs from a position screenshot.

export type Levels = {
  symbol: string;
  direction: TradeDirection;
  entry: number;
  stop: number;
  target?: number | null;
  exit?: number | null;
  contracts?: number | null;
};

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

export function tradeMaths({ symbol, direction, entry, stop, target, exit, contracts }: Levels) {
  const sign = direction === "LONG" ? 1 : -1;
  const riskPts = Math.abs(entry - stop);
  const { pointValue } = getPointValue(symbol);
  const plannedR = target != null && riskPts > 0 ? round(((target - entry) * sign) / riskPts) : null;
  const resultPts = exit != null ? round((exit - entry) * sign) : null;
  const resultR = resultPts != null && riskPts > 0 ? round(resultPts / riskPts) : null;
  const pnl = resultPts != null && contracts ? round(resultPts * pointValue * contracts) : null;
  const riskDollars = contracts ? round(riskPts * pointValue * contracts) : null;
  return { riskPts: round(riskPts), plannedR, resultPts, resultR, pnl, riskDollars };
}

// Within a tenth of R of entry counts as break-even.
export function outcomeFromR(r: number): TradeOutcome {
  return r > 0.1 ? "WIN" : r < -0.1 ? "LOSS" : "BREAKEVEN";
}

export function planLine(l: Levels) {
  const m = tradeMaths(l);
  const parts = [
    `${l.direction === "LONG" ? "Long" : "Short"} ${l.contracts ? `${l.contracts}x ` : ""}${l.symbol} @ ${l.entry}`,
    `stop ${l.stop} (${m.riskPts} pts${m.riskDollars != null ? `, $${m.riskDollars}` : ""})`,
  ];
  if (l.target != null) parts.push(`TP ${l.target}${m.plannedR != null ? ` (${m.plannedR}R)` : ""}`);
  if (l.exit != null) parts.push(`exit ${l.exit} (${m.resultPts} pts, ${m.resultR}R)`);
  return parts.join(" · ");
}

export const isFutures = (symbol: string) => KNOWN_FUTURES_SYMBOLS.includes(symbol);
