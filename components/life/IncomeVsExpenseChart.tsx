"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/life/format";
import type { MonthlySeriesPoint } from "@/lib/life/aggregate";

const INCOME_COLOR = "#34d399";
const EXPENSE_COLOR = "#f87171";

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as MonthlySeriesPoint;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-neutral-50">{label}</p>
      <p className="text-emerald-400">Income {formatCurrency(point.income)}</p>
      <p className="text-red-400">Expense {formatCurrency(point.expense)}</p>
      <p className="text-neutral-400">Net {formatCurrency(point.income - point.expense)}</p>
    </div>
  );
}

export function IncomeVsExpenseChart({ data }: { data: MonthlySeriesPoint[] }) {
  const hasAnyData = data.some((p) => p.income > 0 || p.expense > 0);

  return (
    <Card>
      <h2 className="text-lg font-semibold">Income vs. expenses</h2>
      <p className="mb-4 text-sm text-neutral-500">Last {data.length} months, for the selected view.</p>
      {!hasAnyData ? (
        <p className="mt-2 text-sm text-neutral-500">Not enough data yet.</p>
      ) : (
        <div style={{ width: "100%", height: 260 }} className="mt-2">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="month"
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
              <Legend wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }} />
              <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 4, 4]} />
              <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
