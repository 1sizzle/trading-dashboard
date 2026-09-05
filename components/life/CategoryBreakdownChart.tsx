"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/life/format";
import type { CategoryBucket } from "@/lib/life/aggregate";

const BAR_COLOR = "#a78bfa";

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0].payload as CategoryBucket;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-neutral-50">{label}</p>
      <p className="text-violet-300">{formatCurrency(bucket.amount)}</p>
    </div>
  );
}

export function CategoryBreakdownChart({ data }: { data: CategoryBucket[] }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Spending by category</h2>
      <p className="mb-4 text-sm text-neutral-500">This month, for the selected view.</p>
      {data.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">No expenses logged this month yet.</p>
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
                width={70}
                tickFormatter={(value: number) => formatCurrency(value)}
              />
              <Tooltip content={ChartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="amount" radius={[4, 4, 4, 4]} fill={BAR_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
