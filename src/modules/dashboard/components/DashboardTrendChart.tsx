"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { IconChartBar, IconChartArea } from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { useFormatMoney } from "@/hooks/useFormatMoney";

const SKELETON_BAR_HEIGHTS = [32, 58, 41, 76, 43, 67, 52, 37, 70, 46, 63, 35, 55, 48];

export type TrendDataPoint = {
  date: string;
  depositAmount: number;
  depositCount: number;
  withdrawalAmount: number;
  withdrawalCount: number;
};

interface Props {
  data: TrendDataPoint[];
  loading?: boolean;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatMoney,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatMoney: (value: number, options?: { includeSign?: boolean }) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2 pb-1.5 border-b border-slate-100">
        {label ? formatShortDate(label) : ""}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between items-center gap-3 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-slate-800">{formatMoney(p.value, { includeSign: true })}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardTrendChart({ data, loading }: Props) {
  const { formatMoney } = useFormatMoney();
  const fmt = (value: number) => formatMoney(value, { includeSign: true });
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const chartData = data.map((d) => ({
    ...d,
    date: d.date,
    label: formatShortDate(d.date),
  }));

  const hasData = data.some((d) => d.depositAmount > 0 || d.withdrawalAmount > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Transaction Trends</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Filtered transaction amounts over time (withdrawals settled = approved)</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setChartType("area")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              chartType === "area" ? "bg-white shadow-sm text-[var(--brand-primary)]" : "text-slate-400 hover:text-slate-600",
            )}
          >
            <IconChartArea className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              chartType === "bar" ? "bg-white shadow-sm text-[var(--brand-primary)]" : "text-slate-400 hover:text-slate-600",
            )}
          >
            <IconChartBar className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className="flex-1 p-4 min-h-[280px]">
        {loading ? (
          <div className="h-full flex items-end gap-1 animate-pulse px-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-slate-100"
                style={{ height: `${SKELETON_BAR_HEIGHTS[i] ?? 50}%` }}
              />
            ))}
          </div>
        ) : !hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
              <IconChartArea className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">No data available</p>
            <p className="text-xs text-slate-300 mt-1">Try selecting a different date range</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="depositGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803d" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="withdrawalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c62828" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#c62828" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(value) => fmt(Number(value ?? 0))}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={96}
                />
                <Tooltip content={<CustomTooltip formatMoney={formatMoney} />} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                  iconType="circle"
                  iconSize={7}
                />
                <Area
                  type="monotone"
                  dataKey="depositAmount"
                  name="Deposits"
                  stroke="#15803d"
                  strokeWidth={2}
                  fill="url(#depositGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#15803d" }}
                />
                <Area
                  type="monotone"
                  dataKey="withdrawalAmount"
                  name="Withdrawals"
                  stroke="#c62828"
                  strokeWidth={2}
                  fill="url(#withdrawalGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#c62828" }}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(value) => fmt(Number(value ?? 0))}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={96}
                />
                <Tooltip content={<CustomTooltip formatMoney={formatMoney} />} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                  iconType="circle"
                  iconSize={7}
                />
                <Bar dataKey="depositAmount" name="Deposits" fill="#15803d" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="withdrawalAmount" name="Withdrawals" fill="#c62828" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
