"use client";

import { cn } from "@/lib/cn";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import type { BalanceSheetTotals, BalanceSheetMeta } from "@/types/balanceSheet";
import {
  IconBuildingBank,
  IconScale,
  IconTrendingUp,
  IconAlertTriangle,
  IconCircleCheck,
} from "@tabler/icons-react";

interface BalanceSheetKpiStripProps {
  totals: BalanceSheetTotals;
  meta: BalanceSheetMeta;
}

export function BalanceSheetKpiStrip({ totals, meta }: BalanceSheetKpiStripProps) {
  const { formatMoney } = useFormatMoney();

  const cards = [
    {
      label: "Total Assets",
      value: totals.totalAssets,
      compare: totals.compareTotalAssets,
      icon: IconBuildingBank,
      tone: "text-emerald-700",
      bg: "bg-emerald-50/60",
    },
    {
      label: "Total Liabilities",
      value: totals.totalLiabilities,
      compare: totals.compareTotalLiabilities,
      icon: IconScale,
      tone: "text-rose-700",
      bg: "bg-rose-50/60",
    },
    {
      label: "Equity",
      value: totals.totalEquity,
      compare: totals.compareTotalEquity,
      icon: IconTrendingUp,
      tone: "text-slate-800",
      bg: "bg-slate-50",
    },
    {
      label: "Net P&L",
      value: totals.netPL,
      compare: null,
      icon: IconTrendingUp,
      tone: totals.netPL >= 0 ? "text-indigo-700" : "text-rose-700",
      bg: "bg-indigo-50/40",
    },
  ];

  return (
    <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const delta =
            card.compare != null && Number.isFinite(card.compare)
              ? card.value - Number(card.compare)
              : null;
          return (
            <div
              key={card.label}
              className={cn(
                "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
                card.bg,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {card.label}
                </span>
                <Icon className={cn("h-4 w-4", card.tone)} aria-hidden />
              </div>
              <p className={cn("mt-2 text-2xl font-bold tabular-nums", card.tone)}>
                {formatMoney(card.value)}
              </p>
              {delta != null && (
                <p
                  className={cn(
                    "mt-1 text-[11px] font-semibold tabular-nums",
                    delta >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {delta >= 0 ? "+" : ""}
                  {formatMoney(delta)} vs compare
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400"><span>Balance composition</span><span>{formatMoney(totals.totalLiabilities + totals.totalEquity)} funded</span></div>
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-label="Balance composition ratio">
          <div className="bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, totals.totalAssets ? (totals.totalAssets / Math.max(totals.totalAssets, totals.totalLiabilities + totals.totalEquity)) * 100 : 0))}%` }} />
          <div className="bg-rose-400" style={{ width: `${Math.min(100, Math.max(0, totals.totalAssets ? (totals.totalLiabilities / Math.max(totals.totalAssets, totals.totalLiabilities + totals.totalEquity)) * 100 : 0))}%` }} />
          <div className="bg-indigo-400 flex-1" />
        </div>
        <div className="mt-2 flex gap-4 text-[11px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Assets</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Liabilities</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-400" />Equity</span></div>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm",
          meta.isBalanced
            ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
            : "border-amber-200 bg-amber-50/60 text-amber-900",
        )}
        role="status"
        aria-live="polite"
      >
        {meta.isBalanced ? (
          <IconCircleCheck className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <IconAlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span className="font-semibold">
          {meta.isBalanced ? "Sheet is balanced" : "Sheet difference"}
        </span>
        {!meta.isBalanced && (
          <span className="font-mono text-xs font-bold">{formatMoney(meta.difference)}</span>
        )}
        <span className="text-xs text-slate-500">
          Period Gross P&L {formatMoney(totals.grossPL)} · Period Net P&L{" "}
          {formatMoney(totals.netPL)}
        </span>
        {meta.compareFromDate && meta.compareToDate && (
          <span className="text-xs text-slate-400">
            Compare {meta.compareFromDate} → {meta.compareToDate}
          </span>
        )}
        <span className="text-xs text-slate-400">
          {meta.currency} · {meta.timeZone}
        </span>
      </div>
    </div>
  );
}
