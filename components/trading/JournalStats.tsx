import type { JournalStats as Stats } from "@/lib/trading/journal-stats";

function StatCard({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold text-neutral-50 ${valueClassName}`}>{value}</p>
    </div>
  );
}

export function JournalStats({ stats }: { stats: Stats }) {
  const netClass = stats.netR > 0 ? "text-emerald-400" : stats.netR < 0 ? "text-red-400" : "";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total trades" value={String(stats.totalTrades)} />
      <StatCard label="Win rate" value={`${stats.winRate.toFixed(1)}%`} />
      <StatCard label="Avg R:R" value={`${stats.avgRR.toFixed(2)}R`} />
      <StatCard
        label="Net R"
        value={`${stats.netR > 0 ? "+" : ""}${stats.netR.toFixed(2)}R`}
        valueClassName={netClass}
      />
    </div>
  );
}
