import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/trading/calc";
import type { RankedBucket } from "@/lib/trading/insights";

export function WorstBestCallout({ title, ranked }: { title: string; ranked: RankedBucket[] }) {
  if (ranked.length === 0) {
    return (
      <Card>
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="text-sm text-neutral-500">No trade data yet.</p>
      </Card>
    );
  }

  const worst = ranked[0];
  const best = ranked[ranked.length - 1];

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {ranked.length === 1 ? (
        <p className="text-sm text-neutral-400">
          Only data for <span className="font-medium text-neutral-50">{worst.label}</span> so far
          ({worst.count} trade{worst.count === 1 ? "" : "s"}, avg {formatCurrency(worst.avgPnl)}
          /trade) — not enough variety yet to compare.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-neutral-400">Worst</p>
            <p className="mt-1 text-lg font-semibold text-red-400">{worst.label}</p>
            <p className="text-sm text-neutral-400">
              avg {formatCurrency(worst.avgPnl)}/trade over {worst.count} trade
              {worst.count === 1 ? "" : "s"}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Best</p>
            <p className="mt-1 text-lg font-semibold text-emerald-400">{best.label}</p>
            <p className="text-sm text-neutral-400">
              avg {formatCurrency(best.avgPnl)}/trade over {best.count} trade
              {best.count === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
