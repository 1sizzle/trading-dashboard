import { getPointValue } from "@/lib/trading/contracts";

// Shared by both the live webhook and the CSV backfill importer, so an
// occurrence is never classified two different ways depending on its source.
export function classifySetupOutcome(pnlPoints: number): "WIN" | "LOSS" | "BREAKEVEN" {
  if (pnlPoints > 0) return "WIN";
  if (pnlPoints < 0) return "LOSS";
  return "BREAKEVEN";
}

export function calculateSetupPnlDollars(symbol: string, pnlPoints: number, contracts: number): number {
  const { pointValue } = getPointValue(symbol);
  return pnlPoints * pointValue * contracts;
}
