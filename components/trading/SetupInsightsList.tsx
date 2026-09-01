import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/trading/calc";
import type { RankedBucket } from "@/lib/trading/insights";

export function SetupInsightsList({ ranked }: { ranked: RankedBucket[] }) {
  if (ranked.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Setups that work / don&apos;t</h2>
        <p className="mt-2 text-sm text-neutral-500">
          No tagged trades yet — tag trades in the journal to see patterns here.
        </p>
      </Card>
    );
  }

  const worst = ranked.slice(0, 3).filter((bucket) => bucket.avgPnl < 0);
  const best = [...ranked]
    .reverse()
    .slice(0, 3)
    .filter((bucket) => bucket.avgPnl > 0);

  return (
    <Card>
      <h2 className="text-lg font-semibold">Setups that work / don&apos;t</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Tags are the closest thing to a setup type here — doubles as that breakdown.
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-300">Avoid</p>
          {worst.length === 0 ? (
            <p className="text-sm text-neutral-500">No consistently losing tags yet.</p>
          ) : (
            <ul className="space-y-2">
              {worst.map((bucket) => (
                <li key={bucket.label} className="text-sm">
                  <span className="font-medium text-neutral-50">{bucket.label}</span>{" "}
                  <span className="text-red-400">{formatCurrency(bucket.avgPnl)}/trade</span>{" "}
                  <span className="text-neutral-500">({bucket.count})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-300">Lean into</p>
          {best.length === 0 ? (
            <p className="text-sm text-neutral-500">No consistently winning tags yet.</p>
          ) : (
            <ul className="space-y-2">
              {best.map((bucket) => (
                <li key={bucket.label} className="text-sm">
                  <span className="font-medium text-neutral-50">{bucket.label}</span>{" "}
                  <span className="text-emerald-400">{formatCurrency(bucket.avgPnl)}/trade</span>{" "}
                  <span className="text-neutral-500">({bucket.count})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
