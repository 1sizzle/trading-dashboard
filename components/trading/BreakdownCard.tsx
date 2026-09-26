import type { BreakdownRow } from "@/lib/trading/analytics-stats";

export function BreakdownCard({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
      <h2 className="text-xs uppercase tracking-wider text-neutral-500">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">No data yet.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-right text-xs uppercase tracking-wider text-neutral-500">
              <th className="pb-2 text-left font-medium" />
              <th className="w-20 pb-2 font-medium">WR</th>
              <th className="w-24 pb-2 font-medium">Avg RR</th>
              <th className="w-12 pb-2 font-medium">N</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-neutral-800/60">
                <td className="py-2 pr-2 text-neutral-200">{row.label}</td>
                <td
                  className={`py-2 text-right font-mono ${
                    row.winRate >= 50 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {row.winRate.toFixed(0)}%
                </td>
                <td className="py-2 text-right font-mono text-neutral-300">{row.avgRR.toFixed(2)}R</td>
                <td className="py-2 text-right font-mono text-neutral-400">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
