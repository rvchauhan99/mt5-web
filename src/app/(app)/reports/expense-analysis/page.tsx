"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  IconRefresh,
  IconCalendar,
  IconTrendingUp,
  IconClock,
  IconCircleCheck,
  IconX,
  IconBan,
} from "@tabler/icons-react";
import type { ExpenseAnalysisSummary } from "@/services/expenseService";
import { normalizeExpense } from "@/services/expenseService";
import { Button } from "@/components/ui/Button";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import {
  reportService,
} from "@/services/reportService";
import type { ExpenseAnalysisFilterParams } from "@/services/expenseService";
import { useExport } from "@/hooks/useExport";
import type { ExpenseRow } from "@/types/expense";
import { getApiErrorMessage } from "@/lib/apiError";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";

import { ExpenseKpiStrip } from "@/modules/expense/components/ExpenseKpiStrip";
import { ExpenseAnalysisCharts } from "@/modules/expense/components/ExpenseAnalysisCharts";
import { ExpenseAnalysisFilterPanel } from "@/modules/expense/components/ExpenseAnalysisFilterPanel";
import { EXPENSE_FINAL_FILTER_KEYS } from "@/modules/expense/expenseFinalListConstants";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { toast } from "sonner";

function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = toLocalYmd(new Date());
      return { expenseDate_from: d, expenseDate_to: d };
    },
  },
  {
    label: "This Week",
    fn: () => {
      const n = new Date();
      const dy = n.getDay();
      const m = new Date(n);
      m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1));
      const e = new Date(m);
      e.setDate(m.getDate() + 6);
      return { expenseDate_from: toLocalYmd(m), expenseDate_to: toLocalYmd(e) };
    },
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        expenseDate_from: toLocalYmd(new Date(n.getFullYear(), n.getMonth(), 1)),
        expenseDate_to: toLocalYmd(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
      };
    },
  },
  {
    label: "Last 3M",
    fn: () => {
      const n = new Date();
      const p = new Date(n);
      p.setMonth(n.getMonth() - 3);
      return { expenseDate_from: toLocalYmd(p), expenseDate_to: toLocalYmd(n) };
    },
  },
  {
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        expenseDate_from: toLocalYmd(new Date(n.getFullYear(), 0, 1)),
        expenseDate_to: toLocalYmd(new Date(n.getFullYear(), 11, 31)),
      };
    },
  },
];

const STATUS_TABS = [
  { value: null, label: "All", icon: null, cls: "text-slate-600 border-slate-200 hover:border-slate-400" },
  { value: "pending_audit", label: "Pending", icon: IconClock, cls: "text-amber-600 border-amber-200 hover:border-amber-400", activeCls: "bg-amber-50 border-amber-400 text-amber-700" },
  { value: "approved", label: "Approved", icon: IconCircleCheck, cls: "text-emerald-600 border-emerald-200 hover:border-emerald-400", activeCls: "bg-emerald-50 border-emerald-400 text-emerald-700" },
  { value: "rejected", label: "Rejected", icon: IconX, cls: "text-red-500 border-red-200 hover:border-red-400", activeCls: "bg-red-50 border-red-400 text-red-600" },
  { value: "cancelled", label: "Cancelled", icon: IconBan, cls: "text-slate-600 border-slate-200 hover:border-slate-400", activeCls: "bg-slate-100 border-slate-400 text-slate-800" },
];

function toOptionalFilterValue(value: string): string | undefined {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? undefined : trimmed;
}

function str(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (v === undefined || v === null) return "";
  return String(v);
}

function buildExpenseAnalysisApiParams(q: string, filters: Record<string, string>): ExpenseAnalysisFilterParams {
  return {
    search: toOptionalFilterValue(q || ""),
    status: toOptionalFilterValue(filters.status || ""),
    expenseTypeId: toOptionalFilterValue(filters.expenseTypeId || ""),
    bankId: toOptionalFilterValue(filters.bankId || ""),
    amount: toOptionalFilterValue(filters.amount || ""),
    amount_to: toOptionalFilterValue(filters.amount_to || ""),
    amount_op: toOptionalFilterValue(filters.amount_op || ""),
    createdBy: toOptionalFilterValue(filters.createdBy || ""),
    approvedBy: toOptionalFilterValue(filters.approvedBy || ""),
    createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
    createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
    createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
    expenseDate_from: toOptionalFilterValue(filters.expenseDate_from || ""),
    expenseDate_to: toOptionalFilterValue(filters.expenseDate_to || ""),
    expenseDate_op: toOptionalFilterValue(filters.expenseDate_op || ""),
  };
}

export default function ExpenseAnalysisPage() {
  const { formatMoney } = useFormatMoney();
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: [...EXPENSE_FINAL_FILTER_KEYS],
  });
  const {
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setLimit,
    setFilters,
    setSort,
    clearFilters,
    q,
    setQ,
  } = listingState;

  const [summary, setSummary] = useState<ExpenseAnalysisSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const defaultTodayInitializedRef = useRef(false);

  /** Stable key so the summary effect does not re-run when `filters` is a new object with the same values. */
  const filtersIdentityKey = useMemo(() => JSON.stringify(filters), [filters]);

  const filterParams = useMemo<ExpenseAnalysisFilterParams>(
    () => buildExpenseAnalysisApiParams(q, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `filtersIdentityKey` captures filter values; `filters` is current when the key changes.
    [filtersIdentityKey, q],
  );

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      setSummaryLoading(true);
      try {
        const s = await reportService.expenseAnalysisSummary({ ...filterParams, signal: ac.signal });
        if (!cancelled) setSummary(s);
      } catch (e: unknown) {
        if (axios.isCancel(e)) return;
        toast.error(getApiErrorMessage(e, "Failed to load report summary"));
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [filterParams]);

  const fetcher = useCallback(
    async (params: Record<string, unknown>) => {
      const p = Number(params.page) || 1;
      const l = Number(params.limit) || 20;
      const sb = (str(params, "sortBy") || "expenseDate") as "createdAt" | "expenseDate" | "amount";
      const so = str(params, "sortOrder") === "asc" ? "asc" : "desc";
      const result = await reportService.expenseAnalysisRecords({
        ...filterParams,
        page: p,
        pageSize: l,
        sortBy: sb,
        sortOrder: so,
      });
      const rows: Record<string, unknown>[] = Array.isArray(result?.data)
        ? (result.data as Record<string, unknown>[])
        : [];
      return {
        data: rows.map((row) => normalizeExpense(row)),
        meta: result?.meta,
      };
    },
    [filterParams],
  );

  const { exporting, handleExport } = useExport((params) => reportService.exportExpenseAnalysis(params), {
    fileName: `expense-analysis-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      ...filterParams,
      sortBy: sortBy || "expenseDate",
      sortOrder: sortOrder || "desc",
    });
  }, [handleExport, filterParams, sortBy, sortOrder]);

  const resetAllFilters = useCallback(() => {
    clearFilters({ keepQuickSearch: false });
    setActivePreset(null);
  }, [clearFilters]);

  const handlePreset = (preset: (typeof DATE_PRESETS)[0]) => {
    const dates = preset.fn();
    setFilters({
      ...filters,
      ...dates,
      expenseDate_op: "inRange",
    }, true, false);
    setActivePreset(preset.label);
  };

  const handleStatusTab = (val: string | null) => {
    setFilters(
      {
        ...filters,
        status: val || "",
      },
      true,
      false,
    );
  };

  useEffect(() => {
    if (defaultTodayInitializedRef.current) return;
    const hasExpenseDate =
      String(filters.expenseDate_from ?? "").trim() !== "" ||
      String(filters.expenseDate_to ?? "").trim() !== "";
    const today = toLocalYmd(new Date());

    if (hasExpenseDate) {
      setActivePreset(
        filters.expenseDate_from === today && filters.expenseDate_to === today ? "Today" : null,
      );
      defaultTodayInitializedRef.current = true;
      return;
    }

    setFilters(
      {
        ...filters,
        expenseDate_from: today,
        expenseDate_to: today,
        expenseDate_op: "inRange",
      },
      true,
      false,
    );
    setActivePreset("Today");
    defaultTodayInitializedRef.current = true;
  }, [filters, setFilters]);

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "expenseDate",
        label: "Date",
        ...tableColumnPresets.dateCol,
        sortable: true,
      },
      {
        field: "expenseTypeName",
        label: "Category",
        render: (row: ExpenseRow) => row.expenseTypeName || "—",
        minWidth: 150,
      },
      {
        field: "bankName",
        label: "Settlement",
        render: (row: ExpenseRow) =>
          row.settlementAccountType === "person"
            ? row.liabilityPersonName?.trim()
              ? `LP: ${row.liabilityPersonName.trim()}`
              : "—"
            : row.bankName || "—",
        minWidth: 150,
      },
      {
        field: "amount",
        label: "Amount",
        render: (row: ExpenseRow) => formatMoney(row.amount),
        sortable: true,
        minWidth: 120,
      },
      {
        field: "status",
        label: "Status",
        ...tableColumnPresets.statusCol,
        render: (row: ExpenseRow) => <TableStatusBadge status={row.status} />,
        sortable: true,
      },
      {
        field: "createdByName",
        label: "Initiated By",
        render: (row: ExpenseRow) => row.createdByName || "—",
        minWidth: 150,
      },
    ],
    [formatMoney],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="mx-auto max-w-[1440px] px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary/10 p-2 rounded-xl text-brand-primary">
              <IconTrendingUp size={24} stroke={2} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Expense Analysis</h1>
              <p className="text-[11px] text-slate-500 font-medium">Business Spend · Trends · Audit Analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
              <IconCalendar size={12} /> Quick Range:
            </span>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p)}
                className={[
                  "text-[11px] px-3 py-1 rounded-full border font-semibold transition-all shadow-sm",
                  activePreset === p.label
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-white border-slate-200 text-slate-500 hover:border-brand-primary hover:text-brand-primary",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={resetAllFilters}
              className="h-8 text-xs gap-1 px-3 rounded-full"
            >
              <IconRefresh size={14} /> Reset All
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <ExpenseAnalysisFilterPanel
            q={q}
            filters={filters as Record<string, string>}
            setQ={setQ}
            setFilters={setFilters as (f: Record<string, string>) => void}
            onClear={resetAllFilters}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap pb-1">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = (filters.status || null) === tab.value;
            return (
              <button
                key={String(tab.label)}
                type="button"
                onClick={() => handleStatusTab(tab.value)}
                className={[
                  "flex items-center gap-1.5 text-[11px] font-bold px-4 py-1.5 rounded-full border transition-all shadow-sm",
                  isActive
                    ? tab.activeCls || "bg-brand-primary text-white border-brand-primary"
                    : `bg-white ${tab.cls}`,
                ].join(" ")}
              >
                {Icon && <Icon size={14} />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {summaryLoading && !summary ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading dashboard…
          </div>
        ) : (
          <>
            {summary && (
              <ExpenseKpiStrip summary={summary} statusFilter={filters.status} />
            )}
            {summary && summary.byExpenseType.length > 0 && (
              <div className="pt-2">
                <ExpenseAnalysisCharts data={summary.byExpenseType} />
              </div>
            )}
          </>
        )}

        <div className="pt-2">
          <ListingPageContainer
            title="Detailed Audit Log"
            description="Complete list of expenses matching your current dashboard filters."
            fullWidth
            exportButtonLabel="Export Report"
            onExportClick={onExportClick}
            exportDisabled={exporting}
          >
            <PaginatedTableReference
              columns={columns}
              fetcher={fetcher}
              filterParams={filterParams}
              height="500px"
              showSearch={false}
              showPagination={false}
              onTotalChange={setTotalCount}
              page={page}
              limit={limit}
              sortBy={sortBy || "expenseDate"}
              sortOrder={sortOrder || "desc"}
              onPageChange={(zeroBased) => setPage(zeroBased + 1)}
              onRowsPerPageChange={setLimit}
              onSortChange={(field, order) => setSort(field, order)}
              compactDensity
            />
            <PaginationControlsReference
              page={page - 1}
              rowsPerPage={limit}
              totalCount={totalCount}
              onPageChange={(zeroBased) => setPage(zeroBased + 1)}
              onRowsPerPageChange={setLimit}
              rowsPerPageOptions={[20, 50, 100]}
            />
          </ListingPageContainer>
        </div>
      </div>
    </div>
  );
}
