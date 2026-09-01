import Link from "next/link";
import { formatCurrency, formatDuration, formatNewYorkDateTime } from "@/lib/trading/calc";
import type { Tag, Trade, TradeTag } from "@/lib/generated/prisma/client";

type TradeWithTags = Trade & { tags: (TradeTag & { tag: Tag })[] };

// Read-only, unlike TradeTable — this page is for reviewing a session, not
// editing trades (that stays the Journal's job).
export function SessionTradeTable({ trades }: { trades: TradeWithTags[] }) {
  if (trades.length === 0) {
    return <p className="text-sm text-neutral-500">No New York session trades on this date.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-neutral-400">
            <th className="px-4 py-2 font-medium">Entry time</th>
            <th className="px-4 py-2 font-medium">Symbol</th>
            <th className="px-4 py-2 font-medium">Dir</th>
            <th className="px-4 py-2 font-medium">P&L</th>
            <th className="px-4 py-2 font-medium">R</th>
            <th className="px-4 py-2 font-medium">Duration</th>
            <th className="px-4 py-2 font-medium">Tags</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const pnl = Number(trade.pnl);
            const rMultiple = trade.rMultiple !== null ? Number(trade.rMultiple) : null;
            return (
              <tr key={trade.id} className="border-b border-neutral-900 last:border-0">
                <td className="whitespace-nowrap px-4 py-2 text-neutral-300">
                  {formatNewYorkDateTime(trade.entryTime)}
                </td>
                <td className="px-4 py-2 font-medium">{trade.symbol}</td>
                <td className="px-4 py-2 text-neutral-300">
                  {trade.direction === "LONG" ? "Long" : "Short"}
                </td>
                <td
                  className={`px-4 py-2 font-medium ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {formatCurrency(pnl)}
                </td>
                <td className="px-4 py-2 text-neutral-300">
                  {rMultiple !== null ? `${rMultiple.toFixed(2)}R` : "—"}
                </td>
                <td className="px-4 py-2 text-neutral-300">
                  {formatDuration(trade.durationMinutes)}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {trade.tags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="whitespace-nowrap rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/dashboard/trading/journal/${trade.id}/edit`}
                    className="text-neutral-400 hover:text-neutral-50"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
