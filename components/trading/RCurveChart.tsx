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
import type { CurvePoint } from "@/lib/trading/analytics-stats";

function CurveTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as CurvePoint;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-neutral-50">
        {point.date} · Trade #{point.tradeIndex}
      </p>
      <p className={point.cumulativeR >= 0 ? "text-emerald-400" : "text-red-400"}>
        {point.cumulativeR > 0 ? "+" : ""}
        {point.cumulativeR.toFixed(2)}R
      </p>
    </div>
  );
}

export function RCurveChart({ data }: { data: CurvePoint[] }) {
  const finalValue = data.length > 0 ? data[data.length - 1].cumulativeR : 0;
  const lineColor = finalValue >= 0 ? "#34d399" : "#f87171";

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis dataKey="tradeIndex" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={{ stroke: "#262626" }} />
          <YAxis
            stroke="#a3a3a3"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => `${value}R`}
          />
          <ReferenceLine y={0} stroke="#525252" />
          <Tooltip content={CurveTooltip} />
          <Line type="monotone" dataKey="cumulativeR" stroke={lineColor} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
