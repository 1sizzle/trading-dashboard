import { db } from "@/lib/core/db";
import { RiskSettingsForm } from "@/components/trading/RiskSettingsForm";
import { DailyRiskStatus } from "@/components/trading/DailyRiskStatus";
import { PositionSizeCalculator } from "@/components/trading/PositionSizeCalculator";
import { getNewYorkDayRangeUtc, getTodayNewYorkDateValue } from "@/lib/trading/calc";

// This page shows live account state (risk settings, today's trades) — it
// must never be statically cached, and must not depend on DB access at
// build time.
export const dynamic = "force-dynamic";

export default async function RiskPage() {
  const settings = await db.riskSettings.findFirst();
  const { start, end } = getNewYorkDayRangeUtc(getTodayNewYorkDateValue());

  const todaysTrades = await db.trade.findMany({
    where: { entryTime: { gte: start, lt: end } },
  });
  const todaysPnl = todaysTrades.reduce((sum, trade) => sum + Number(trade.pnl), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Risk Tracker</h1>
        <p className="mt-1 text-neutral-400">
          Daily loss limit, risk used today, and a position size calculator.
        </p>
      </div>

      <DailyRiskStatus
        dailyLossLimit={settings ? Number(settings.dailyLossLimit) : null}
        todaysPnl={todaysPnl}
      />

      <PositionSizeCalculator
        defaultRiskDollars={settings ? Number(settings.maxRiskPerTrade) : null}
      />

      <RiskSettingsForm settings={settings} />
    </div>
  );
}
