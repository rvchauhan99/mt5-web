"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconRefresh, IconLayoutDashboard, IconDownload, IconFileSpreadsheet, IconFileText } from "@tabler/icons-react";
import { useExport } from "@/hooks/useExport";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from "@/components/ui/shadcn/dropdown-menu";
import { DashboardFilterPanel, type DashboardFilters } from "./DashboardFilterPanel";
import { DATE_PRESETS, DEFAULT_PRESET } from "./DashboardFilterBar";
import { DashboardKPIs, type DashboardSummary } from "./DashboardKPIs";
import { DashboardTrendChart, type TrendDataPoint } from "./DashboardTrendChart";
import { DashboardPLDonut } from "./DashboardPLDonut";
import { DashboardRecentActivity, type RecentActivityItem } from "./DashboardRecentActivity";
import { DashboardExchangeSummary } from "./DashboardExchangeSummary";
import { DashboardBankSummary } from "./DashboardBankSummary";
import { DashboardExchangeClosingStrip } from "./DashboardExchangeClosingStrip";
import { formatYyyyMmDdInTimeZone, resolveUserTimeZone } from "@/lib/userTimezone";
import { reportService } from "@/services/reportService";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

function getInitialFilters(): DashboardFilters {
  const preset = DATE_PRESETS.find((p) => p.label === DEFAULT_PRESET);
  const dates = preset ? preset.fn() : { date_from: "", date_to: "" };
  return { 
    date_from: dates.date_from || "", 
    date_to: dates.date_to || "",
    status: "all",
    transaction_type: "all",
    player_id: "",
    bank_id: "",
    exchange_id: "",
    amount_from: "",
    amount_to: "",
    search: "",
  };
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isToday(dateStr: string): boolean {
  const tz = resolveUserTimeZone();
  const today = formatYyyyMmDdInTimeZone(new Date(), tz);
  return dateStr === today;
}

export function DashboardContent() {
  const [filters, setFilters] = useState(getInitialFilters);
  const [activePreset, setActivePreset] = useState<string | null>(DEFAULT_PRESET);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const appliedFilterChips = [
    filters.status !== "all" ? `Status: ${filters.status}` : "",
    filters.transaction_type !== "all" ? `Type: ${filters.transaction_type}` : "",
    filters.player_id ? "Player" : "",
    filters.bank_id ? "Bank" : "",
    filters.exchange_id ? "Exchange" : "",
    filters.amount_from ? `Min: ${filters.amount_from}` : "",
    filters.amount_to ? `Max: ${filters.amount_to}` : "",
    filters.search ? `Search: ${filters.search}` : "",
  ].filter(Boolean);

  const userTz = resolveUserTimeZone();
  const now = new Date();
  const timeLabel = now.toLocaleTimeString("en-IN", {
    timeZone: userTz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const todayBoth = isToday(filters.date_from) && isToday(filters.date_to);

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);

    try {
      const res = await reportService.dashboardSummary({
        fromDate: filters.date_from,
        toDate: filters.date_to,
        exchangeId: filters.exchange_id || undefined,
        status: filters.status,
        transactionType: filters.transaction_type,
        playerId: filters.player_id || undefined,
        bankId: filters.bank_id || undefined,
        amountFrom: filters.amount_from || undefined,
        amountTo: filters.amount_to || undefined,
        search: filters.search || undefined,
      });

      const data = res?.data ?? res;
      if (!data) return;

      const nextSummary = {
        deposit: data.deposit ?? { totalAmount: 0, totalCount: 0, pendingCount: 0, pendingAmount: 0, verifiedAmount: 0, verifiedCount: 0, rejectedCount: 0, bonusTotal: 0 },
        withdrawal: data.withdrawal ?? { totalAmount: 0, totalCount: 0, pendingCount: 0, pendingAmount: 0, approvedAmount: 0, approvedCount: 0, rejectedCount: 0, reverseBonusTotal: 0 },
        expense: data.expense ?? { totalAmount: 0, totalCount: 0, pendingCount: 0, approvedAmount: 0 },
        pnl: data.pnl ?? { gross: 0, net: 0 },
        exchanges: data.exchanges ?? { total: 0, active: 0 },
        users: data.users ?? { total: 0 },
        periodMetrics: data.periodMetrics ?? { newPlayers: 0, firstTimeDepositAmount: 0 },
        exchangesBreakdown: Array.isArray(data.exchangesBreakdown) ? data.exchangesBreakdown : [],
        banksBreakdown: Array.isArray(data.banksBreakdown)
          ? data.banksBreakdown.map((row: Record<string, unknown>) => ({
              ...row,
              depositCount: Number(row.depositCount ?? 0),
              withdrawalCount: Number(row.withdrawalCount ?? 0),
              expenseCount: Number(row.expenseCount ?? 0),
              transferOutCount: Number(row.transferOutCount ?? 0),
              transferInCount: Number(row.transferInCount ?? 0),
              entries: Number(row.entries ?? 0),
            }))
          : [],
      } as DashboardSummary;
      setSummary(nextSummary);
      setTrendData(Array.isArray(data.trendData) ? data.trendData : []);
      setRecentActivity(Array.isArray(data.recentActivity) ? data.recentActivity : []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "CanceledError") return;
      setSummary(null);
      setTrendData([]);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  }, [
    filters.date_from,
    filters.date_to,
    filters.exchange_id,
    filters.status,
    filters.transaction_type,
    filters.player_id,
    filters.bank_id,
    filters.amount_from,
    filters.amount_to,
    filters.search,
  ]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData, refreshToken]);

  const handlePreset = (preset: (typeof DATE_PRESETS)[0]) => {
    const dates = preset.fn();
    setFilters((f) => ({ ...f, date_from: dates.date_from || "", date_to: dates.date_to || "" }));
    setActivePreset(preset.label);
  };

  const handleReset = () => {
    setFilters(getInitialFilters());
    setActivePreset(DEFAULT_PRESET);
  };

  const handleApplyFilters = (next: DashboardFilters) => {
    setFilters(next);
    setActivePreset(null);
  };

  const { exporting, handleExport } = useExport((params) => reportService.exportDashboardSummary(params), {
    fileName: `dashboard-report-${formatYyyyMmDdInTimeZone(new Date(), resolveUserTimeZone())}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      fromDate: filters.date_from,
      toDate: filters.date_to,
      exchangeId: filters.exchange_id || undefined,
      status: filters.status,
      transactionType: filters.transaction_type,
      playerId: filters.player_id || undefined,
      bankId: filters.bank_id || undefined,
      amountFrom: filters.amount_from || undefined,
      amountTo: filters.amount_to || undefined,
      search: filters.search || undefined,
    });
  }, [handleExport, filters]);

  return (
    <div className="space-y-4 pb-8">
      {/* ───── Page Header ───── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--brand-primary)] rounded-xl shadow-sm">
            <IconLayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              Operations Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {todayBoth ? (
                <span>
                  Showing <strong className="text-[var(--brand-primary)] font-semibold">Today&apos;s</strong> data
                  {" "}&mdash; {timeLabel}
                </span>
              ) : (
                <span>
                  {filters.date_from && formatDisplayDate(filters.date_from)}
                  {filters.date_to && filters.date_to !== filters.date_from ? ` → ${formatDisplayDate(filters.date_to)}` : ""}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                loading={exporting || loading}
                startIcon={<IconDownload />}
              >
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="" inset={false}>Choose Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onExportClick} className="cursor-pointer">
                  <IconFileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()} className="cursor-pointer">
                  <IconFileText className="mr-2 h-4 w-4 text-rose-600" />
                  <span>PDF Report (.pdf)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshToken((t) => t + 1)}
            loading={loading}
            startIcon={<IconRefresh className={cn(loading && "animate-spin")} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ───── Filter panel ───── */}
      <DashboardFilterPanel
        filters={filters}
        onApply={handleApplyFilters}
        activePreset={activePreset}
        onPreset={handlePreset}
        onReset={handleReset}
        loading={loading}
      />

      <div className="flex flex-wrap gap-2">
        {appliedFilterChips.length > 0 ? (
          appliedFilterChips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
            >
              {chip}
            </span>
          ))
        ) : (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            No advanced filters applied
          </span>
        )}
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
          Withdrawal pending = requested, settled = approved
        </span>
      </div>

      {/* ───── Today badge ───── */}
      {todayBoth && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-pulse" />
          <span className="text-xs font-medium text-[var(--brand-primary)]">
            Full Day Summary —{" "}
            {new Date().toLocaleDateString("en-IN", {
              timeZone: userTz,
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      {/* ───── KPI Cards ───── */}
      <DashboardKPIs summary={summary} loading={loading} />

      <DashboardExchangeClosingStrip
        exchangesBreakdown={summary?.exchangesBreakdown}
        loading={loading}
        playerScoped={Boolean(filters.player_id)}
      />

      {/* ───── Exchange Breakdowns ───── */}
      <DashboardExchangeSummary exchangesBreakdown={summary?.exchangesBreakdown} loading={loading} />

      {/* ───── Bank Wise Summary ───── */}
      <DashboardBankSummary banksBreakdown={summary?.banksBreakdown} loading={loading} />

      {/* ───── Charts Row ───── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Trend Chart — 8/12 */}
        <div className="col-span-12 lg:col-span-8 min-h-[360px]">
          <DashboardTrendChart data={trendData} loading={loading} />
        </div>

        {/* Donut Chart — 4/12 */}
        <div className="col-span-12 lg:col-span-4 min-h-[360px]">
          <DashboardPLDonut summary={summary} loading={loading} />
        </div>
      </div>

      {/* ───── Recent Activity Table ───── */}
      <DashboardRecentActivity items={recentActivity} loading={loading} />
    </div>
  );
}
