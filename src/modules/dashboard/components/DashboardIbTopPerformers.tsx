"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { IconUsersGroup } from "@tabler/icons-react";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import type { DashboardIbTopPerformer } from "./DashboardKPIs";

interface Props {
  performers: DashboardIbTopPerformer[];
  loading?: boolean;
}

function formatIbLabel(row: DashboardIbTopPerformer) {
  const id = row.playerId?.trim() || "—";
  const phone = row.phone?.trim();
  return phone ? `${id} · ${phone}` : id;
}

function truncateLabel(label: string, max = 18) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

const CustomTooltip = ({
  active,
  payload,
  formatMoney,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { fullLabel: string; count: number } }[];
  formatMoney: (value: number, options?: { includeSign?: boolean }) => string;
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-2 pb-1.5 border-b border-slate-100">
        {p.payload.fullLabel}
      </p>
      <div className="flex justify-between items-center gap-3 py-0.5">
        <span className="text-slate-500">Commission</span>
        <span className="font-semibold text-slate-800">
          {formatMoney(p.value, { includeSign: true })}
        </span>
      </div>
      <div className="flex justify-between items-center gap-3 py-0.5">
        <span className="text-slate-500">Accruals</span>
        <span className="font-semibold text-slate-800">{p.payload.count}</span>
      </div>
    </div>
  );
};

export function DashboardIbTopPerformers({ performers, loading = false }: Props) {
  const { formatMoney } = useFormatMoney();
  const fmt = (value: number) => formatMoney(value, { includeSign: true });

  const chartData = performers.map((row, index) => {
    const fullLabel = formatIbLabel(row);
    return {
      rank: index + 1,
      label: truncateLabel(fullLabel),
      fullLabel,
      totalAmount: row.totalAmount,
      count: row.count,
    };
  });

  const hasData = chartData.some((d) => d.totalAmount > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Top IB Performers</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Highest referral commission in the selected period
          </p>
        </div>
        <div className="p-1.5 bg-slate-100 rounded-lg">
          <IconUsersGroup className="w-4 h-4 text-slate-400" aria-hidden />
        </div>
      </div>

      <div className="flex-1 p-4 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-[280px]">
        <div className="min-h-[240px]">
          {loading ? (
            <div className="h-full flex flex-col justify-center gap-2 animate-pulse px-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-6 bg-slate-100 rounded" style={{ width: `${70 - i * 8}%` }} />
              ))}
            </div>
          ) : !hasData ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No IB commission in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v) => formatMoney(Number(v), { includeSign: false })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip formatMoney={formatMoney} />}
                  cursor={{ fill: "rgba(15, 118, 110, 0.06)" }}
                />
                <Bar dataKey="totalAmount" name="Commission" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="overflow-auto">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 rounded" />
              ))}
            </div>
          ) : !hasData ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Ranked list will appear here
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Top IB performers by commission</caption>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th scope="col" className="py-2 pr-2 font-medium w-10">Rank</th>
                  <th scope="col" className="py-2 pr-2 font-medium">IB</th>
                  <th scope="col" className="py-2 pr-2 font-medium text-right">Amount</th>
                  <th scope="col" className="py-2 font-medium text-right">Accruals</th>
                </tr>
              </thead>
              <tbody>
                {performers.map((row, index) => (
                  <tr
                    key={row.referrerPlayerId || `${row.playerId}-${index}`}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="py-2 pr-2 text-slate-500 tabular-nums">{index + 1}</td>
                    <td className="py-2 pr-2 text-slate-700 font-medium">
                      {formatIbLabel(row)}
                    </td>
                    <td className="py-2 pr-2 text-right text-teal-700 font-semibold tabular-nums">
                      {fmt(row.totalAmount)}
                    </td>
                    <td className="py-2 text-right text-slate-500 tabular-nums">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
