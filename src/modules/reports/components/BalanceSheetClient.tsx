"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconScale,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/shadcn/dropdown-menu";
import { Button } from "@/components/ui/Button";
import { reportService } from "@/services/reportService";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { useExport } from "@/hooks/useExport";
import type {
  BalanceSheetCompareMode,
  BalanceSheetData,
  BalanceSheetLedger,
} from "@/types/balanceSheet";
import { BalanceSheetKpiStrip } from "./BalanceSheetKpiStrip";
import {
  BalanceSheetFilters,
  toLocalYmd,
  type BalanceSheetFilterValues,
} from "./BalanceSheetFilters";
import { BalanceSheetTree } from "./BalanceSheetTree";
import { BalanceSheetDrilldown } from "./BalanceSheetDrilldown";
import { PLATFORM_NAME } from "@/lib/constants/branding";

function defaultFilters(): BalanceSheetFilterValues {
  const n = new Date();
  return {
    fromDate: toLocalYmd(new Date(n.getFullYear(), n.getMonth(), 1)),
    toDate: toLocalYmd(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
    exchangeId: "",
    compare: "none",
    showZeroBalances: false,
  };
}

export function BalanceSheetClient() {
  const [filters, setFilters] = useState<BalanceSheetFilterValues>(defaultFilters);
  const [applied, setApplied] = useState<BalanceSheetFilterValues>(defaultFilters);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillLedger, setDrillLedger] = useState<BalanceSheetLedger | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const queryParams = useMemo(
    () => ({
      fromDate: applied.fromDate,
      toDate: applied.toDate,
      exchangeId: applied.exchangeId || undefined,
      compare: applied.compare as BalanceSheetCompareMode,
      showZeroBalances: applied.showZeroBalances,
      includeSubGroups: true,
    }),
    [applied],
  );

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sheet = await reportService.balanceSheet(queryParams, ac.signal);
        if (!cancelled) setData(sheet);
      } catch (error: unknown) {
        if (axios.isCancel(error)) return;
        toast.error(getApiErrorMessage(error, "Failed to load balance sheet"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [queryParams]);

  const { exporting, handleExport } = useExport(
    (params) => reportService.exportBalanceSheet(params),
    {
      fileName: `balance-sheet-${applied.fromDate}-${applied.toDate}.xlsx`,
    },
  );

  const handleApply = useCallback(() => {
    if (!filters.fromDate || !filters.toDate) {
      toast.error("From and To dates are required");
      return;
    }
    if (filters.fromDate > filters.toDate) {
      toast.error("From date must be on or before To date");
      return;
    }
    setApplied({ ...filters });
  }, [filters]);

  const handleReset = useCallback(() => {
    const next = defaultFilters();
    setFilters(next);
    setApplied(next);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const showCompare = applied.compare !== "none";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          #balance-sheet-print, #balance-sheet-print * { visibility: visible; }
          #balance-sheet-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 16px;
          }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 1cm; }
        }
      `,
        }}
      />

      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <div className="mx-auto max-w-[1440px] px-4 py-6 space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap no-print">
            <div className="flex items-center gap-3">
              <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary">
                <IconScale size={24} stroke={2} aria-hidden />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                  Balance Sheet
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Tally-style · Assets · Liabilities · Equity
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  startIcon={<IconDownload size={16} />}
                  disabled={!data || exporting}
                >
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel inset={false}>Choose Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleExport(queryParams)}
                >
                  <IconFileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={handlePrint}>
                  <IconFileText className="mr-2 h-4 w-4 text-rose-600" />
                  <span>Print / PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="no-print">
            <BalanceSheetFilters
              values={filters}
              onChange={setFilters}
              onApply={handleApply}
              onReset={handleReset}
            />
          </div>

          {loading && !data ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Loading balance sheet…
            </div>
          ) : data ? (
            <div id="balance-sheet-print" ref={printRef} className="space-y-5">
              <div className="hidden print:block mb-4">
                <h2 className="text-2xl font-bold">{PLATFORM_NAME} Balance Sheet</h2>
                <p className="text-sm text-slate-500">
                  {data.meta.fromDate} to {data.meta.toDate}
                  {data.meta.compareFromDate
                    ? ` · Compare ${data.meta.compareFromDate} → ${data.meta.compareToDate}`
                    : ""}
                </p>
              </div>

              <BalanceSheetKpiStrip totals={data.totals} meta={data.meta} />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <BalanceSheetTree
                  title="Assets"
                  nodes={data.assets}
                  showCompare={showCompare}
                  onLedgerClick={setDrillLedger}
                />
                <div className="space-y-4">
                  <BalanceSheetTree
                    title="Liabilities"
                    nodes={data.liabilities}
                    showCompare={showCompare}
                    onLedgerClick={setDrillLedger}
                  />
                  <BalanceSheetTree
                    title="Capital & Equity"
                    nodes={data.equity}
                    showCompare={showCompare}
                    onLedgerClick={setDrillLedger}
                  />
                </div>
              </div>

              <p className="text-center text-[10px] text-slate-400 print:block pt-2">
                *** End of Balance Sheet *** · Generated{" "}
                {new Date().toLocaleString("en-IN")}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No data available for the selected period.
            </div>
          )}
        </div>
      </div>

      <div className="no-print">
        <BalanceSheetDrilldown
          open={Boolean(drillLedger)}
          ledger={drillLedger}
          fromDate={applied.fromDate}
          toDate={applied.toDate}
          exchangeId={applied.exchangeId || undefined}
          onClose={() => setDrillLedger(null)}
        />
      </div>
    </>
  );
}
