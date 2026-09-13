"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconScale,
  IconDeviceFloppy,
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
import { Tabs } from "@/components/ui/Tabs";
import { reportService } from "@/services/reportService";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { useExport } from "@/hooks/useExport";
import { useAuth } from "@/context/AuthContext";
import { NAV_PERMISSIONS } from "@/lib/constants/navPermissions";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import type {
  BalanceSheetCompareMode,
  BalanceSheetData,
  BalanceSheetGroupNode,
  BalanceSheetLedger,
  BalanceSheetMovementType,
  BalanceSheetTabId,
} from "@/types/balanceSheet";
import { BalanceSheetKpiStrip } from "./BalanceSheetKpiStrip";
import {
  BalanceSheetFilters,
  toLocalYmd,
  type BalanceSheetFilterValues,
} from "./BalanceSheetFilters";
import { BalanceSheetTree } from "./BalanceSheetTree";
import { BalanceSheetDrilldown } from "./BalanceSheetDrilldown";
import { BalanceSheetOverviewCharts } from "./BalanceSheetOverviewCharts";
import { BalanceSheetSkeleton } from "./BalanceSheetSkeleton";
import { BalanceSheetMovementsTab } from "./balance-sheet/BalanceSheetMovementsTab";
import { PLATFORM_NAME } from "@/lib/constants/branding";

const TAB_ITEMS: Array<{ id: BalanceSheetTabId; label: string }> = [
  { id: "statement", label: "Statement" },
  { id: "deposits", label: "Deposits" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "expenses", label: "Expenses" },
  { id: "liabilities", label: "Liabilities" },
  { id: "transfers", label: "Transfers" },
];

const FILTER_KEYS = [
  "tab",
  "fromDate",
  "toDate",
  "exchangeId",
  "compare",
  "showZeroBalances",
  "groupCode",
  "search",
  "showMovementColumns",
  "compactDensity",
  "summaryOnly",
  "showCharts",
];

function defaultFilters(): BalanceSheetFilterValues {
  const n = new Date();
  return {
    fromDate: toLocalYmd(new Date(n.getFullYear(), n.getMonth(), 1)),
    toDate: toLocalYmd(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
    exchangeId: "",
    compare: "none",
    showZeroBalances: false,
    groupCode: "",
    search: "",
    showMovementColumns: false,
    compactDensity: false,
    summaryOnly: false,
    showCharts: true,
  };
}

function filterNodesBySearch(
  nodes: BalanceSheetGroupNode[],
  search: string,
): BalanceSheetGroupNode[] {
  const q = search.trim().toLowerCase();
  if (!q) return nodes;

  const walk = (list: BalanceSheetGroupNode[]): BalanceSheetGroupNode[] => {
    const out: BalanceSheetGroupNode[] = [];
    for (const n of list) {
      const ledgers = n.ledgers.filter((l) => l.name.toLowerCase().includes(q));
      const subGroups = walk(n.subGroups);
      const selfMatch = n.name.toLowerCase().includes(q);
      if (selfMatch || ledgers.length > 0 || subGroups.length > 0) {
        out.push({
          ...n,
          ledgers: selfMatch ? n.ledgers : ledgers,
          subGroups,
        });
      }
    }
    return out;
  };
  return walk(nodes);
}

export function BalanceSheetClient() {
  const { user } = useAuth();
  const defaults = useMemo(() => defaultFilters(), []);
  const listing = useListingQueryStateReference({
    defaultLimit: 25,
    filterKeys: FILTER_KEYS,
  });

  const applied: BalanceSheetFilterValues = useMemo(() => {
    const f = listing.filters;
    return {
      fromDate: f.fromDate || defaults.fromDate,
      toDate: f.toDate || defaults.toDate,
      exchangeId: f.exchangeId || "",
      compare: (f.compare as BalanceSheetCompareMode) || "none",
      showZeroBalances: f.showZeroBalances === "true",
      groupCode: f.groupCode || "",
      search: f.search || "",
      showMovementColumns: f.showMovementColumns === "true",
      compactDensity: f.compactDensity === "true",
      summaryOnly: f.summaryOnly === "true",
      showCharts: f.showCharts !== "false",
    };
  }, [listing.filters, defaults]);

  const activeTab = (listing.filters.tab as BalanceSheetTabId) || "statement";

  const [draft, setDraft] = useState<BalanceSheetFilterValues>(applied);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyToken, setApplyToken] = useState(0);
  const [drillLedger, setDrillLedger] = useState<BalanceSheetLedger | null>(null);
  const [expandAllToken, setExpandAllToken] = useState(0);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  const queryParams = useMemo(
    () => ({
      fromDate: applied.fromDate,
      toDate: applied.toDate,
      exchangeId: applied.exchangeId || undefined,
      groupCode: applied.groupCode || undefined,
      compare: applied.compare as BalanceSheetCompareMode,
      showZeroBalances: applied.showZeroBalances,
      includeSubGroups: true,
    }),
    [applied],
  );

  useEffect(() => {
    if (activeTab !== "statement") return;
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
        if (!cancelled) {
          setLoading(false);
          setApplying(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [queryParams, activeTab, applyToken]);

  useEffect(() => {
    if (activeTab !== "statement") setApplying(false);
  }, [activeTab]);

  const { exporting, handleExport } = useExport(
    (params) => reportService.exportBalanceSheet(params),
    {
      fileName: `balance-sheet-${applied.fromDate}-${applied.toDate}.xlsx`,
    },
  );

  const handleApply = useCallback(() => {
    if (applying) return;
    if (!draft.fromDate || !draft.toDate) {
      toast.error("From and To dates are required");
      return;
    }
    if (draft.fromDate > draft.toDate) {
      toast.error("From date must be on or before To date");
      return;
    }
    const draftMatchesApplied =
      draft.fromDate === applied.fromDate &&
      draft.toDate === applied.toDate &&
      draft.exchangeId === applied.exchangeId &&
      draft.compare === applied.compare &&
      draft.showZeroBalances === applied.showZeroBalances &&
      draft.groupCode === applied.groupCode &&
      draft.search === applied.search &&
      draft.showMovementColumns === applied.showMovementColumns &&
      draft.compactDensity === applied.compactDensity &&
      draft.summaryOnly === applied.summaryOnly &&
      draft.showCharts === applied.showCharts;
    if (activeTab === "statement") {
      setApplying(true);
      if (draftMatchesApplied) setApplyToken((token) => token + 1);
    }
    listing.setFilters(
      {
        tab: activeTab,
        fromDate: draft.fromDate,
        toDate: draft.toDate,
        exchangeId: draft.exchangeId || "",
        compare: draft.compare,
        showZeroBalances: draft.showZeroBalances ? "true" : "",
        groupCode: draft.groupCode || "",
        search: draft.search || "",
        showMovementColumns: draft.showMovementColumns ? "true" : "",
        compactDensity: draft.compactDensity ? "true" : "",
        summaryOnly: draft.summaryOnly ? "true" : "",
        showCharts: draft.showCharts ? "true" : "false",
      },
      true,
    );
  }, [applying, applied, draft, listing, activeTab]);

  const handleReset = useCallback(() => {
    const next = defaultFilters();
    setApplying(false);
    setDraft(next);
    listing.setFilters(
      {
        tab: "statement",
        fromDate: next.fromDate,
        toDate: next.toDate,
        exchangeId: "",
        compare: "none",
        showZeroBalances: "",
        groupCode: "",
        search: "",
        showMovementColumns: "",
        compactDensity: "",
        summaryOnly: "",
        showCharts: "",
      },
      true,
    );
  }, [listing]);

  const handleTabChange = (id: string) => {
    listing.setFilters({ ...listing.filters, tab: id }, false);
  };

  const handlePrint = () => {
    setExpandAllToken((t) => t + 1);
    setTimeout(() => window.print(), 150);
  };

  const canSnapshot = (user?.permissions ?? []).includes(
    NAV_PERMISSIONS.REPORTS_BALANCE_SHEET_ADMIN,
  );

  const handleSnapshot = async () => {
    if (!canSnapshot) return;
    const note = window.prompt("Optional note for this snapshot:") ?? undefined;
    setSavingSnapshot(true);
    try {
      await reportService.createBalanceSheetSnapshot({
        fromDate: applied.fromDate,
        toDate: applied.toDate,
        exchangeId: applied.exchangeId || undefined,
        note: note?.trim() || undefined,
      });
      toast.success("Balance sheet snapshot saved");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to save snapshot"));
    } finally {
      setSavingSnapshot(false);
    }
  };

  const showCompare = applied.compare !== "none";

  const filteredAssets = useMemo(
    () => (data ? filterNodesBySearch(data.assets, applied.search) : []),
    [data, applied.search],
  );
  const filteredLiabilities = useMemo(
    () => (data ? filterNodesBySearch(data.liabilities, applied.search) : []),
    [data, applied.search],
  );
  const filteredEquity = useMemo(
    () => (data ? filterNodesBySearch(data.equity, applied.search) : []),
    [data, applied.search],
  );

  const movementType: BalanceSheetMovementType | null =
    activeTab === "deposits"
      ? "deposit"
      : activeTab === "withdrawals"
        ? "withdrawal"
        : activeTab === "expenses"
          ? "expense"
          : activeTab === "liabilities"
            ? "liability"
            : activeTab === "transfers"
              ? "transfer"
              : null;

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
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          @page { size: A4 landscape; margin: 1cm; }
        }
      `,
        }}
      />

      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <div className="mx-auto max-w-[1440px] px-4 py-6 space-y-5">
          <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-slate-50/95 backdrop-blur border-b border-slate-200/80 no-print">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary">
                  <IconScale size={24} stroke={2} aria-hidden />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                    Balance Sheet
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Statement · Movements · As-of liabilities · Period P&amp;L
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canSnapshot && activeTab === "statement" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    startIcon={<IconDeviceFloppy size={16} />}
                    disabled={savingSnapshot || !data}
                    onClick={handleSnapshot}
                  >
                    Snapshot
                  </Button>
                )}
                {activeTab === "statement" && (
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
                )}
              </div>
            </div>
          </div>

          <div className="no-print">
            <BalanceSheetFilters
              values={draft}
              onChange={setDraft}
              onApply={handleApply}
              onReset={handleReset}
              applying={applying}
            />
          </div>

          <div className="no-print overflow-x-auto">
            <Tabs tabs={TAB_ITEMS} activeId={activeTab} onChange={handleTabChange} />
          </div>

          {activeTab === "statement" ? (
            loading && !data ? (
              <div
                className="rounded-xl border border-slate-200 bg-white"
              >
                <BalanceSheetSkeleton showCharts={applied.showCharts} />
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
                    {" · "}
                    {data.meta.currency} · {data.meta.timeZone}
                    {" · "}
                    {data.meta.isBalanced ? "Balanced" : `Difference ${data.meta.difference}`}
                  </p>
                </div>

                {applied.exchangeId && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 no-print">
                    Exchange filter scopes float, pending withdrawals, IB, and period P&amp;L.
                    Bank and person ledgers remain company-wide.
                  </p>
                )}

                <BalanceSheetKpiStrip totals={data.totals} meta={data.meta} />

                {applied.showCharts && !applied.summaryOnly && (
                  <BalanceSheetOverviewCharts assets={filteredAssets} liabilities={filteredLiabilities} equity={filteredEquity} totals={data.totals} />
                )}

                {!applied.summaryOnly && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <BalanceSheetTree
                      title="Assets"
                      nodes={filteredAssets}
                      showCompare={showCompare}
                      showMovementColumns={applied.showMovementColumns}
                      compactDensity={applied.compactDensity}
                      expandAllToken={expandAllToken}
                      onLedgerClick={setDrillLedger}
                    />
                    <div className="space-y-4">
                      <BalanceSheetTree
                        title="Liabilities"
                        nodes={filteredLiabilities}
                        showCompare={showCompare}
                        showMovementColumns={applied.showMovementColumns}
                        compactDensity={applied.compactDensity}
                        expandAllToken={expandAllToken}
                        onLedgerClick={setDrillLedger}
                      />
                      <BalanceSheetTree
                        title="Capital & Equity"
                        nodes={filteredEquity}
                        showCompare={showCompare}
                        showMovementColumns={applied.showMovementColumns}
                        compactDensity={applied.compactDensity}
                        expandAllToken={expandAllToken}
                        onLedgerClick={setDrillLedger}
                      />
                    </div>
                  </div>
                )}

                <p className="text-center text-[10px] text-slate-400 print:block pt-2">
                  *** End of Balance Sheet *** · Period Net P&amp;L in equity · Generated{" "}
                  {new Date().toLocaleString("en-IN")}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                No data available for the selected period.
              </div>
            )
          ) : movementType ? (
            <div className="no-print">
              <BalanceSheetMovementsTab
                type={movementType}
                fromDate={applied.fromDate}
                toDate={applied.toDate}
                exchangeId={applied.exchangeId || undefined}
              />
            </div>
          ) : null}
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
