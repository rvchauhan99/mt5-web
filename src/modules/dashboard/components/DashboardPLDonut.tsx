"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { IconChartDonut } from "@tabler/icons-react";
import { useFormatMoney } from "@/hooks/useFormatMoney";

export type PLDonutSummary = {
  deposit: { verifiedAmount: number };
  withdrawal: { approvedAmount: number };
  expense: { approvedAmount: number };
};

interface Props {
  summary: PLDonutSummary | null;
  loading?: boolean;
}

const COLORS = ["#15803d", "#c62828", "#c27803"];
const SEGMENTS = ["Deposits (Verified)", "Withdrawals (Approved)", "Expenses (Approved)"];

const CustomTooltip = ({
  active,
  payload,
  formatMoney,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { fill: string } }[];
  formatMoney: (value: number, options?: { includeSign?: boolean }) => string;
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.payload.fill }} />
        <span className="text-slate-600">{p.name}</span>
      </div>
      <p className="font-semibold text-slate-800 mt-1 text-sm">{formatMoney(p.value, { includeSign: true })}</p>
    </div>
  );
};

export function DashboardPLDonut({ summary, loading }: Props) {
  const { formatMoney } = useFormatMoney();
  const fmt = (value: number) => formatMoney(value, { includeSign: true });
  const depositsVal = summary?.deposit?.verifiedAmount ?? 0;
  const withdrawalsVal = summary?.withdrawal?.approvedAmount ?? 0;
  const expensesVal = summary?.expense?.approvedAmount ?? 0;

  const pieData = [
    { name: SEGMENTS[0], value: depositsVal, fill: COLORS[0] },
    { name: SEGMENTS[1], value: withdrawalsVal, fill: COLORS[1] },
    { name: SEGMENTS[2], value: expensesVal, fill: COLORS[2] },
  ].filter((d) => d.value > 0);

  const hasData = pieData.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Distribution Breakdown</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Settled amounts by category</p>
        </div>
        <div className="p-1.5 bg-slate-100 rounded-lg">
          <IconChartDonut className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-4 flex flex-col justify-center min-h-[260px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 animate-pulse">
            <div className="w-32 h-32 rounded-full border-[16px] border-slate-100" />
            <div className="space-y-2 w-full px-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-100" />
                  <div className="h-3 flex-1 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center text-center h-full">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
              <IconChartDonut className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">No settled data</p>
            <p className="text-xs text-slate-300 mt-1">Approved transactions will appear here</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatMoney={formatMoney} />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2 px-2 mt-1">
              {[
                { label: "Deposits", value: depositsVal, color: COLORS[0] },
                { label: "Withdrawals", value: withdrawalsVal, color: COLORS[1] },
                { label: "Expenses", value: expensesVal, color: COLORS[2] },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
