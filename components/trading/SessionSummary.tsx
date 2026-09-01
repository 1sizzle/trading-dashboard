import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { formatCurrency } from "@/lib/trading/calc";
import type { TradeSummary } from "@/lib/trading/analytics";

export function SessionSummary({ summary }: { summary: TradeSummary }) {
  return (
    <Card>
      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Trades" value={String(summary.count)} />
        <StatTile
          label="Win rate"
          value={summary.winRate !== null ? `${summary.winRate.toFixed(0)}%` : "—"}
        />
        <StatTile
          label="Total P&L"
          value={formatCurrency(summary.totalPnl)}
          valueClassName={summary.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <StatTile
          label="Avg R"
          value={summary.avgRMultiple !== null ? `${summary.avgRMultiple.toFixed(2)}R` : "—"}
        />
      </div>
    </Card>
  );
}
