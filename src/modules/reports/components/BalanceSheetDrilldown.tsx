"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconDownload, IconX } from "@tabler/icons-react";
import { reportService } from "@/services/reportService";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { useExport } from "@/hooks/useExport";
import type { BalanceSheetDrilldownRow, BalanceSheetLedger } from "@/types/balanceSheet";
import { Button } from "@/components/ui/Button";
import PaginatedTableReference from "@/components/common/PaginatedTableReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";

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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!open || !ledger) return;
    setPage(1);
    setReloadToken((t) => t + 1);
  }, [open, ledger?.ledgerId, fromDate, toDate, exchangeId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filterParams = useMemo(
    () => ({
      ledgerId: ledger?.ledgerId ?? "",
      ledgerType: ledger?.type ?? "",
      fromDate,
      toDate,
      exchangeId: exchangeId || "",
    }),
    [ledger?.ledgerId, ledger?.type, fromDate, toDate, exchangeId],
  );

  const fetcher = useCallback(
    async (params: Record<string, unknown>) => {
      if (!ledger) return { data: [], meta: { total: 0 } };
      const result = await reportService.balanceSheetDrilldown({
        fromDate,
        toDate,
        exchangeId: exchangeId || undefined,
        ledgerId: ledger.ledgerId,
        ledgerType: ledger.type,
        page: params.page as number,
        pageSize: params.limit as number,
      });
      return {
        data: result.rows,
        meta: { total: result.meta.total },
      };
    },
    [ledger, fromDate, toDate, exchangeId],
  );

  const { exporting, handleExport } = useExport(
    (params) => reportService.exportBalanceSheetDrilldown(params as never),
    {
      fileName: `balance-sheet-ledger-${ledger?.ledgerId ?? "export"}-${fromDate}-${toDate}.xlsx`,
    },
  );

  const columns = useMemo(
    () => [
      {
        field: "date",
        label: "Date",
        render: (row: BalanceSheetDrilldownRow) =>
          row.date ? new Date(row.date).toLocaleDateString("en-IN") : "—",
        ...tableColumnPresets.dateCol,
        minWidth: 100,
      },
      {
        field: "type",
        label: "Type",
        render: (row: BalanceSheetDrilldownRow) => (
          <span className="capitalize font-medium">{row.type}</span>
        ),
        minWidth: 90,
      },
      {
        field: "amount",
        label: "Amount",
        render: (row: BalanceSheetDrilldownRow) => (
          <span className="tabular-nums font-semibold">{formatMoney(row.amount)}</span>
        ),
        minWidth: 110,
      },
      {
        field: "direction",
        label: "Dir",
        render: (row: BalanceSheetDrilldownRow) => (
          <span className="uppercase text-[10px] font-bold text-slate-500">{row.direction}</span>
        ),
        minWidth: 56,
      },
      {
        field: "reference",
        label: "Reference",
        render: (row: BalanceSheetDrilldownRow) => row.reference || "—",
        ...tableColumnPresets.nameCol,
        minWidth: 120,
      },
    ],
    [formatMoney],
  );

  if (!open || !ledger) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bs-drilldown-title"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-3xl bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="bs-drilldown-title" className="text-base font-bold text-slate-900 truncate">
              {ledger.name}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {ledger.type} · Closing {formatMoney(ledger.closingBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {fromDate} → {toDate}
              {totalCount > 0 ? ` · ${totalCount} movements` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              startIcon={<IconDownload size={14} />}
              disabled={exporting}
              onClick={() =>
                handleExport({
                  fromDate,
                  toDate,
                  exchangeId: exchangeId || undefined,
                  ledgerId: ledger.ledgerId,
                  ledgerType: ledger.type,
                })
              }
              className="h-8 text-xs"
              aria-label="Export ledger movements to Excel"
            >
              Export
            </Button>
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
        </div>

        <div className="flex-1 overflow-hidden px-3 py-3">
          <PaginatedTableReference
            columns={columns}
            fetcher={fetcher}
            filterParams={filterParams}
            page={page}
            limit={limit}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={(n) => {
              setLimit(n);
              setPage(1);
            }}
            onTotalChange={setTotalCount}
            getRowKey={(row) => {
              const r = row as BalanceSheetDrilldownRow;
              return `${r.type}-${String(r.date)}-${r.reference ?? ""}-${r.amount}-${r.direction}`;
            }}
            showSearch={false}
            height="calc(100vh - 220px)"
            compactDensity
            reloadToken={reloadToken}
          />
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">
          Opening {formatMoney(ledger.openingBalance)} · Debits{" "}
          {formatMoney(ledger.periodDebits)} · Credits {formatMoney(ledger.periodCredits)}
        </div>
      </div>
    </div>
  );
}
