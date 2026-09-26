export interface JournalStats {
  totalTrades: number;
  winRate: number;
  avgRR: number;
  netR: number;
}

// R:R is stored as a positive number; Outcome decides whether it counts for
// (Win) or against (Loss) you. Breakeven contributes 0R.
export function computeJournalStats(
  trades: { outcome: string | null; rMultiple: number | null }[],
): JournalStats {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.outcome === "WIN").length;
  const withR = trades.filter((t) => t.rMultiple !== null);
  const netR = withR.reduce((sum, t) => {
    const r = Math.abs(t.rMultiple as number);
    return sum + (t.outcome === "WIN" ? r : t.outcome === "LOSS" ? -r : 0);
  }, 0);
  const avgRR =
    withR.length > 0
      ? withR.reduce((sum, t) => sum + Math.abs(t.rMultiple as number), 0) / withR.length
      : 0;

  return {
    totalTrades,
    winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
    avgRR,
    netR,
  };
}
