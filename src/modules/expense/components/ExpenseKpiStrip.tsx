"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import {
  IconCurrencyRupee,
  IconHash,
  IconCategory,
  IconChartPie,
  IconBan,
  IconClock,
} from "@tabler/icons-react";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import type { ExpenseAnalysisSummary } from "@/services/expenseService";

interface ExpenseKpiStripProps {
  summary: ExpenseAnalysisSummary;
  /** When set, KPI labels reflect the active status tab filter. */
  statusFilter?: string;
}

export function ExpenseKpiStrip({ summary, statusFilter }: ExpenseKpiStripProps) {
  const { formatMoney } = useFormatMoney();
  const fmt = (value: number, options?: { maximumFractionDigits?: number }) =>
    formatMoney(value, options);
  const byExpenseType = summary.byExpenseType ?? [];
  const netApprovedTotal = summary.netApprovedTotal ?? summary.grandTotal ?? 0;
  const netApprovedCount = summary.netApprovedCount ?? 0;
  const cancelledTotal = summary.cancelledTotal ?? 0;
  const cancelledCount = summary.cancelledCount ?? 0;
  const pendingTotal = summary.pendingTotal ?? 0;
  const pendingCount = summary.pendingCount ?? 0;

  const topCategory = [...byExpenseType].sort((a, b) => b.totalAmount - a.totalAmount)[0];
  const avgAmount =
    summary.totalCount > 0 ? summary.grandTotal / Math.max(summary.totalCount, 1) : 0;

  const showBreakdown = !statusFilter || statusFilter.trim() === "";

  const kpis = showBreakdown
    ? [
        {
          label: "Net Disbursement",
          value: fmt(netApprovedTotal),
          sub: `${netApprovedCount.toLocaleString()} approved`,
          icon: IconCurrencyRupee,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          label: "Cancelled (reversed)",
          value: fmt(cancelledTotal),
          sub: `${cancelledCount.toLocaleString()} reversed`,
          icon: IconBan,
          color: "text-slate-600",
          bg: "bg-slate-100",
        },
        {
          label: "Pending audit",
          value: fmt(pendingTotal),
          sub: `${pendingCount.toLocaleString()} awaiting approval`,
          icon: IconClock,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          label: "Top category (approved)",
          value: topCategory?.name || "None",
          sub: topCategory ? fmt(topCategory.totalAmount) : "No approved spend",
          icon: IconCategory,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
      ]
    : [
        {
          label: "Filtered total",
          value: fmt(summary.grandTotal),
          sub: `${summary.totalCount.toLocaleString()} records`,
          icon: IconCurrencyRupee,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          label: "Total entries",
          value: summary.totalCount.toLocaleString(),
          sub: "Matching filters",
          icon: IconHash,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Average",
          value: fmt(avgAmount, { maximumFractionDigits: 0 }),
          sub: "Per record in view",
          icon: IconChartPie,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          label: "Top category",
          value: topCategory?.name || "None",
          sub: topCategory ? fmt(topCategory.totalAmount) : "No data",
          icon: IconCategory,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
      ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card
          key={kpi.label}
          className="p-4 border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden relative"
        >
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{kpi.value}</h3>
              <p className="text-[10px] text-slate-500 font-medium mt-1">{kpi.sub}</p>
            </div>
            <div className={`${kpi.bg} ${kpi.color} p-2 rounded-lg`}>
              <kpi.icon size={20} stroke={2.5} />
            </div>
          </div>
          <div className={`absolute -right-2 -bottom-2 ${kpi.color} opacity-[0.03]`}>
            <kpi.icon size={64} stroke={1.5} />
          </div>
        </Card>
      ))}
    </div>
  );
}
