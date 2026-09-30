import Link from "next/link";
import { deleteTrade } from "@/app/dashboard/trading/journal/actions";
import { formatCurrency, formatNewYorkDateTime } from "@/lib/trading/calc";
import type { Tag, Trade, TradeTag } from "@/lib/generated/prisma/client";

const SESSION_LABELS: Record<string, string> = {
  NEW_YORK_AM: "New York AM",
  NEW_YORK_PM: "New York PM",
  LONDON: "London",
  ASIA: "Asia",
  OTHER: "Other",
};

const OUTCOME_STYLES: Record<string, string> = {
  WIN: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  LOSS: "border-red-500/30 bg-red-500/10 text-red-300",
  BREAKEVEN: "border-neutral-600 bg-neutral-800 text-neutral-300",
};

const OUTCOME_LABELS: Record<string, string> = { WIN: "Win", LOSS: "Loss", BREAKEVEN: "Breakeven" };

type TradeWithTags = Trade & { tags: (TradeTag & { tag: Tag })[]; account: { name: string } | null };

const headClass = "px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500";

export function JournalTable({ trades }: { trades: TradeWithTags[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/30">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left">
            <th className={headClass}>Date</th>
            <th className={headClass}>Account</th>
            <th className={headClass}>Pair</th>
            <th className={headClass}>Entry model</th>
            <th className={headClass}>Setups</th>
            <th className={headClass}>Position</th>
            <th className={headClass}>Session</th>
            <th className={headClass}>R:R</th>
            <th className={headClass}>P&amp;L</th>
            <th className={headClass}>Outcome</th>
            <th className={headClass}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-4 py-10 text-center text-neutral-500">
                No trades logged yet —{" "}
                <Link href="/dashboard/trading/journal/new" className="text-violet-400 hover:text-violet-300">
                  add your first one
                </Link>
                .
              </td>
            </tr>
          ) : (
            trades.map((trade) => {
              const pnl = Number(trade.pnl);
              const rMultiple = trade.rMultiple !== null ? Number(trade.rMultiple) : null;
              return (
                <tr key={trade.id} className="border-b border-neutral-900 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-300">
                    {formatNewYorkDateTime(trade.entryTime)}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-300">
                    {trade.account?.name ?? trade.accountName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{trade.symbol ?? "—"}</td>
                  <td className="px-4 py-2.5 text-neutral-300">{trade.entryModel ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {trade.tags.length === 0 ? (
                      <span className="text-neutral-600">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {trade.tags.map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="whitespace-nowrap rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-300">
                    {trade.direction === "LONG" ? "Long" : "Short"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-300">
                    {SESSION_LABELS[trade.session] ?? trade.session}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-neutral-300">
                    {rMultiple !== null ? `${rMultiple.toFixed(2)}R` : "—"}
                  </td>
                  <td
                    className={`px-4 py-2.5 font-mono font-medium ${
                      pnl === 0 ? "text-neutral-500" : pnl > 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {pnl === 0 && trade.outcome !== "BREAKEVEN" ? "—" : formatCurrency(pnl)}
                  </td>
                  <td className="px-4 py-2.5">
                    {trade.outcome ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${OUTCOME_STYLES[trade.outcome]}`}
                      >
                        {OUTCOME_LABELS[trade.outcome]}
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/trading/journal/${trade.id}/edit`}
                        className="text-neutral-400 hover:text-neutral-50"
                      >
                        Edit
                      </Link>
                      <form action={deleteTrade}>
                        <input type="hidden" name="id" value={trade.id} />
                        <button type="submit" className="text-neutral-400 hover:text-red-400">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
