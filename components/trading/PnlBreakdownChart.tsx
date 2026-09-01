"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/trading/calc";
import type { PnlBucket } from "@/lib/trading/analytics";

const POSITIVE = "#34d399";
const NEGATIVE = "#f87171";

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0].payload as PnlBucket;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-neutral-50">{label}</p>
      <p className={bucket.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>{formatCurrency(bucket.pnl)}</p>
      <p className="text-neutral-400">
        {bucket.count} trade{bucket.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function PnlBreakdownChart({
  title,
  hint,
  data,
}: {
  title: string;
  hint?: string;
  data: PnlBucket[];
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mb-4 text-sm text-neutral-500">{hint}</p>}
      {data.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Not enough data yet.</p>
      ) : (
        <div style={{ width: "100%", height: 240 }} className="mt-2">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#a3a3a3"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#262626" }}
              />
              <YAxis
                stroke="#a3a3a3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
                tickFormatter={(value: number) => formatCurrency(value)}
              />
              <Tooltip content={ChartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="pnl" radius={[4, 4, 4, 4]}>
                {data.map((entry) => (
                  <Cell key={entry.label} fill={entry.pnl >= 0 ? POSITIVE : NEGATIVE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
