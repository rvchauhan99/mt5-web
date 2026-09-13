"use client";

import { useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { reportService } from "@/services/reportService";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import type { BalanceSheetDrilldownRow, BalanceSheetLedger } from "@/types/balanceSheet";
import { Button } from "@/components/ui/Button";

interface BalanceSheetDrilldownProps {
  open: boolean;
  ledger: BalanceSheetLedger | null;
  fromDate: string;
  toDate: string;
  exchangeId?: string;
  onClose: () => void;
}

export function BalanceSheetDrilldown({
  open,
  ledger,
  fromDate,
  toDate,
  exchangeId,
  onClose,
}: BalanceSheetDrilldownProps) {
  const { formatMoney } = useFormatMoney();
  const [rows, setRows] = useState<BalanceSheetDrilldownRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ledger) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await reportService.balanceSheetDrilldown({
          fromDate,
          toDate,
          exchangeId: exchangeId || undefined,
          ledgerId: ledger.ledgerId,
          ledgerType: ledger.type,
          page: 1,
          pageSize: 100,
        });
        if (!cancelled) setRows(result.rows);
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Failed to load ledger details"));
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, ledger, fromDate, toDate, exchangeId]);

  if (!open || !ledger) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-label={`Ledger details for ${ledger.name}`}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="h-full w-full max-w-lg bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{ledger.name}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {ledger.type} · Closing {formatMoney(ledger.closingBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {fromDate} → {toDate}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close drilldown"
            className="h-8 w-8 p-0"
          >
            <IconX size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading movements…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-400">
              No period movements found for this ledger (or drilldown not available for this type).
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2 text-left font-semibold">Date</th>
                  <th className="py-2 text-left font-semibold">Type</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                  <th className="py-2 text-left font-semibold pl-3">Dir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row, idx) => (
                  <tr key={`${row.type}-${idx}-${row.date}`}>
                    <td className="py-2 text-slate-600">
                      {row.date ? new Date(row.date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-2 text-slate-700 font-medium capitalize">{row.type}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-slate-800">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="py-2 pl-3 uppercase text-[10px] font-bold text-slate-400">
                      {row.direction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">
          Opening {formatMoney(ledger.openingBalance)} · Debits{" "}
          {formatMoney(ledger.periodDebits)} · Credits {formatMoney(ledger.periodCredits)}
        </div>
      </div>
    </div>
  );
}
