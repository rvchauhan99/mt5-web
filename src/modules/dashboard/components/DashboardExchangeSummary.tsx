"use client";

import React from "react";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconTrendingUp,
  IconTrendingDown,
  IconBuildingStore,
  IconUsers,
  IconCash,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { type DashboardSummary } from "./DashboardKPIs";
import { useFormatMoney } from "@/hooks/useFormatMoney";

interface Props {
  exchangesBreakdown: DashboardSummary["exchangesBreakdown"];
  loading?: boolean;
}

export function DashboardExchangeSummary({ exchangesBreakdown, loading = false }: Props) {
  const { formatMoney } = useFormatMoney();
  const fmt = (value: number) => formatMoney(value, { includeSign: true });

  if (!exchangesBreakdown || exchangesBreakdown.length === 0) {
    if (!loading) return null;
    // Loading skeleton
    return (
      <div className="space-y-4 mt-8">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2">
        <IconBuildingStore className="w-5 h-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900 tracking-tight">Exchange Wise Summary</h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {exchangesBreakdown.map((ex) => (
          <div
            key={ex.exchangeId}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-slate-300 transition-all"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-semibold text-slate-800">{ex.name}</h3>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium border",
                ex.netPL >= 0 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                P&L {fmt(ex.netPL)}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Deposit */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Deposits</p>
                <p className="text-base font-bold text-slate-900">{fmt(ex.depositVerified)}</p>
                <div className="flex items-center text-[10px] text-emerald-600">
                  <IconArrowUpRight className="w-3 h-3 mr-0.5" />
                  Verified
                </div>
              </div>

              {/* Withdrawal */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Withdrawals</p>
                <p className="text-base font-bold text-slate-900">{fmt(ex.withdrawalApproved)}</p>
                <div className="flex items-center text-[10px] text-rose-600">
                  <IconArrowDownRight className="w-3 h-3 mr-0.5" />
                  Approved
                </div>
              </div>

              {/* Net Bonus */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Net Bonus</p>
                <p className="text-base font-bold text-amber-700">{fmt(ex.netBonus)}</p>
                <div className="flex flex-col text-[10px] text-slate-500 leading-tight">
                  <span>+{formatMoney(ex.bonusGiven)} D</span>
                  <span>−{formatMoney(ex.bonusRecovered)} W</span>
                </div>
              </div>

              {/* Net P&L (Gross) */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Gross P&L</p>
                <p className={cn(
                  "text-base font-bold",
                  ex.netPL >= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {fmt(ex.netPL)}
                </p>
                <div className={cn(
                  "flex items-center text-[10px]",
                  ex.netPL >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {ex.netPL >= 0 
                    ? <IconTrendingUp className="w-3 h-3 mr-0.5" />
                    : <IconTrendingDown className="w-3 h-3 mr-0.5" />
                  }
                  Profit
                </div>
              </div>

              {/* New Traders */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">New Traders</p>
                <p className="text-base font-bold text-indigo-700">{ex.newPlayers.toLocaleString("en-IN")}</p>
                <div className="flex items-center text-[10px] text-indigo-600">
                  <IconUsers className="w-3 h-3 mr-0.5" />
                  Selected period
                </div>
              </div>

              {/* First-Time Deposit */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">1st Deposit</p>
                <p className="text-base font-bold text-emerald-700">{fmt(ex.firstTimeDepositAmount)}</p>
                <div className="flex items-center text-[10px] text-emerald-600">
                  <IconCash className="w-3 h-3 mr-0.5" />
                  Selected period
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
