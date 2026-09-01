"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/trading/calc";
import type { EquityPoint } from "@/lib/trading/analytics";

function EquityTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as EquityPoint;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-neutral-50">
        {point.date} · Trade #{point.tradeIndex}
      </p>
      <p className={point.cumulativePnl >= 0 ? "text-emerald-400" : "text-red-400"}>
        {formatCurrency(point.cumulativePnl)}
      </p>
    </div>
  );
}

export function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  const finalValue = data.length > 0 ? data[data.length - 1].cumulativePnl : 0;
  const lineColor = finalValue >= 0 ? "#34d399" : "#f87171";

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Equity curve</h2>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500">No trades yet.</p>
      ) : (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="tradeIndex"
                stroke="#a3a3a3"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#262626" }}
                label={{ value: "Trade #", position: "insideBottom", offset: -4, fill: "#a3a3a3", fontSize: 12 }}
              />
              <YAxis
                stroke="#a3a3a3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
                tickFormatter={(value: number) => formatCurrency(value)}
              />
              <ReferenceLine y={0} stroke="#525252" />
              <Tooltip content={EquityTooltip} />
              <Line type="monotone" dataKey="cumulativePnl" stroke={lineColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
