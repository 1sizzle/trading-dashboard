import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/trading/calc";

export function DailyRiskStatus({
  dailyLossLimit,
  todaysPnl,
}: {
  dailyLossLimit: number | null;
  todaysPnl: number;
}) {
  const lossUsed = todaysPnl < 0 ? Math.abs(todaysPnl) : 0;
  const remaining = dailyLossLimit !== null ? dailyLossLimit - lossUsed : null;
  const isOverLimit = remaining !== null && remaining < 0;

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Today&apos;s risk</h2>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-neutral-400">Today&apos;s P&amp;L</p>
          <p
            className={`mt-1 text-lg font-semibold ${todaysPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {formatCurrency(todaysPnl)}
          </p>
        </div>
        <div>
          <p className="text-neutral-400">Loss used today</p>
          <p className="mt-1 text-lg font-semibold text-neutral-50">{formatCurrency(lossUsed)}</p>
        </div>
        <div>
          <p className="text-neutral-400">Daily limit remaining</p>
          {dailyLossLimit === null ? (
            <p className="mt-1 text-sm text-neutral-500">Set a daily loss limit below</p>
          ) : (
            <p
              className={`mt-1 text-lg font-semibold ${isOverLimit ? "text-red-400" : "text-neutral-50"}`}
            >
              {formatCurrency(remaining as number)}
            </p>
          )}
        </div>
      </div>
      {isOverLimit && (
        <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          You&apos;ve hit your daily loss limit.
        </p>
      )}
    </Card>
  );
}
