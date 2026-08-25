"use client";

import React from "react";
import { IconArrowUpRight, IconArrowDownRight, IconClock } from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { formatDateTimeForUser } from "@/lib/userTimezone";

export type RecentActivityItem = {
  _id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: string;
  playerName: string;
  createdBy: string;
  bankName: string;
  utr: string;
  createdAt: unknown;
};

interface Props {
  items: RecentActivityItem[];
  loading?: boolean;
}

function formatTime(createdAt: unknown): string {
  return formatDateTimeForUser(createdAt as string | undefined);
}

const DEPOSIT_STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  finalized: "bg-blue-50 text-blue-700 border-blue-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const WITHDRAWAL_STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  verified: "Verified",
  finalized: "Finalized",
  rejected: "Rejected",
  requested: "Requested",
  approved: "Approved",
};

export function DashboardRecentActivity({ items, loading }: Props) {
  const { formatMoney } = useFormatMoney();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Recent Activity</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Latest deposits & withdrawals in selected period</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <IconClock className="w-3 h-3" />
          <span>Live</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-4 space-y-2 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 h-10">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-16" />
                <div className="h-5 bg-slate-100 rounded-full w-16" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
              <IconClock className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">No transactions found</p>
            <p className="text-xs text-slate-300 mt-1">Transactions in the selected date range will appear here</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                {["Type", "Player / UTR", "Bank", "Amount", "Status", "Time", "By"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50 first:rounded-none whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item) => {
                const isDeposit = item.type === "deposit";
                const statusMap = isDeposit ? DEPOSIT_STATUS_STYLE : WITHDRAWAL_STATUS_STYLE;
                const statusClass = statusMap[item.status] ?? "bg-slate-50 text-slate-500 border-slate-200";
                return (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition-colors group">
                    {/* Type */}
                    <td className="px-4 py-2.5">
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                          isDeposit ? "bg-emerald-50" : "bg-rose-50",
                        )}
                      >
                        {isDeposit ? (
                          <IconArrowUpRight className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <IconArrowDownRight className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                    </td>

                    {/* Player / UTR */}
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-700 truncate max-w-[120px]">
                        {item.playerName || "—"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                        UTR: {item.utr || "—"}
                      </p>
                    </td>

                    {/* Bank */}
                    <td className="px-4 py-2.5">
                      <span className="text-slate-500 truncate max-w-[100px] block">{item.bankName || "—"}</span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          isDeposit ? "text-emerald-700" : "text-rose-700",
                        )}
                      >
                        {isDeposit ? "+" : "−"}{formatMoney(item.amount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium",
                          statusClass,
                        )}
                      >
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-slate-400">{formatTime(item.createdAt)}</span>
                    </td>

                    {/* By */}
                    <td className="px-4 py-2.5">
                      <span className="text-slate-400 truncate max-w-[100px] block">{item.createdBy || "—"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
