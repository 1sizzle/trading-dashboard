import type { PnlBucket } from "@/lib/trading/analytics";

export interface RankedBucket extends PnlBucket {
  avgPnl: number;
}

// Ascending by average P&L per trade (worst first) — deliberately average,
// not total, so a rarely-traded bucket isn't unfairly penalized or flattered
// by volume. No minimum-sample-size cutoff: every bucket's count ships
// alongside its average so the reader can judge confidence themselves.
export function rankBuckets(buckets: PnlBucket[]): RankedBucket[] {
  return buckets
    .map((bucket) => ({ ...bucket, avgPnl: bucket.count > 0 ? bucket.pnl / bucket.count : 0 }))
    .sort((a, b) => a.avgPnl - b.avgPnl);
}
