"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import PaginatedTableReference from "@/components/common/PaginatedTableReference";
import { reportService } from "@/services/reportService";
import { listBankLookupOptions } from "@/services/lookupService";
import { useExport } from "@/hooks/useExport";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import type {
  BalanceSheetMovementRow,
  BalanceSheetMovementType,
} from "@/types/balanceSheet";

interface BalanceSheetMovementsTabProps {
  type: BalanceSheetMovementType;
  fromDate: string;
  toDate: string;
  exchangeId?: string;
}

const STATUS_PILLS: Record<
  BalanceSheetMovementType,
  Array<{ value: string; label: string }>
> = {
  deposit: [
    { value: "", label: "Verified + Finalized" },
    { value: "verified", label: "Verified" },
    { value: "finalized", label: "Finalized" },
  ],
  withdrawal: [
    { value: "", label: "Approved + Finalized" },
    { value: "approved", label: "Approved" },
    { value: "finalized", label: "Finalized" },
    { value: "requested", label: "Requested" },
  ],
  expense: [
    { value: "", label: "Approved + Pending" },
    { value: "approved", label: "Approved" },
    { value: "pending_audit", label: "Pending audit" },
  ],
  liability: [
    { value: "", label: "All types" },
    { value: "receipt", label: "Receipt" },
    { value: "payment", label: "Payment" },
    { value: "contra", label: "Contra" },
    { value: "journal", label: "Journal" },
  ],
  transfer: [
    { value: "", label: "All transfers" },
    { value: "contra", label: "Contra" },
  ],
};

export function BalanceSheetMovementsTab({
  type,
  fromDate,
  toDate,
  exchangeId,
}: BalanceSheetMovementsTabProps) {
  const { formatMoney } = useFormatMoney();
  const [status, setStatus] = useState("");
  const [bankId, setBankId] = useState("");
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("");
  const [activeBankId, setActiveBankId] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [banks, setBanks] = useState<Array<{ id: string; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listBankLookupOptions({ limit: 100 });
        if (!cancelled) {
          setBanks(
            rows.map((r) => ({
              id: String(r.id ?? ""),
              name: String(r.label ?? r.bankName ?? ""),
            })),
          );
        }
      } catch {
        if (!cancelled) setBanks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setStatus("");
    setActiveStatus("");
    setBankId("");
    setActiveBankId("");
    setSearch("");
    setActiveSearch("");
    setPage(1);
    setReloadToken((t) => t + 1);
  }, [type, fromDate, toDate, exchangeId]);

  const filterParams = useMemo(
    () => ({
      type,
      fromDate,
      toDate,
      exchangeId: exchangeId || "",
      status: activeStatus,
      bankId: activeBankId,
      search: activeSearch,
    }),
    [type, fromDate, toDate, exchangeId, activeStatus, activeBankId, activeSearch],
  );

  const fetcher = useCallback(
    async (params: Record<string, unknown>) => {
      const result = await reportService.balanceSheetMovements({
        type,
        fromDate,
        toDate,
        exchangeId: exchangeId || undefined,
        status: activeStatus || undefined,
        bankId: activeBankId || undefined,
        search: activeSearch || undefined,
        page: params.page as number,
        pageSize: params.limit as number,
      });
      return {
        data: result.rows,
        meta: { total: result.meta.total },
      };
    },
    [type, fromDate, toDate, exchangeId, activeStatus, activeBankId, activeSearch],
  );

  const { exporting, handleExport } = useExport(
    (params) => reportService.exportBalanceSheetMovements(params as never),
    {
      fileName: `balance-sheet-${type}-${fromDate}-${toDate}.xlsx`,
    },
  );

  const handleApply = () => {
    setActiveStatus(status);
    setActiveBankId(bankId);
    setActiveSearch(search);
    setPage(1);
    setReloadToken((t) => t + 1);
  };

  const handleReset = () => {
    setStatus("");
    setBankId("");
    setSearch("");
    setActiveStatus("");
    setActiveBankId("");
    setActiveSearch("");
    setPage(1);
    setReloadToken((t) => t + 1);
  };

  const columns = useMemo(
    () => [
      {
        field: "date",
        label: "Date",
        render: (row: BalanceSheetMovementRow) =>
          row.date ? new Date(row.date).toLocaleDateString("en-IN") : "—",
        ...tableColumnPresets.dateCol,
        minWidth: 110,
      },
      {
        field: "status",
        label: "Status",
        render: (row: BalanceSheetMovementRow) => (
          <span className="capitalize font-medium text-slate-700">{row.status}</span>
        ),
        ...tableColumnPresets.nameCol,
        minWidth: 110,
      },
      {
        field: "amount",
        label: "Amount",
        render: (row: BalanceSheetMovementRow) => (
          <span className="tabular-nums font-semibold">{formatMoney(row.amount)}</span>
        ),
        minWidth: 120,
      },
      {
        field: "counterparty",
        label: type === "transfer" || type === "liability" ? "Accounts" : "Counterparty",
        render: (row: BalanceSheetMovementRow) => row.counterparty || "—",
        ...tableColumnPresets.nameCol,
        minWidth: 160,
      },
      {
        field: "bank",
        label: "Bank",
        render: (row: BalanceSheetMovementRow) => row.bank || "—",
        ...tableColumnPresets.nameCol,
        minWidth: 140,
      },
      {
        field: "reference",
        label: "Reference",
        render: (row: BalanceSheetMovementRow) => row.reference || "—",
        ...tableColumnPresets.nameCol,
        minWidth: 120,
      },
      {
        field: "description",
        label: "Description",
        render: (row: BalanceSheetMovementRow) => row.description || "—",
        ...tableColumnPresets.nameCol,
        minWidth: 160,
      },
    ],
    [formatMoney, type],
  );

  const pills = STATUS_PILLS[type] ?? [];

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {pills.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setStatus(p.value);
                setActiveStatus(p.value);
                setPage(1);
                setReloadToken((t) => t + 1);
              }}
              className={[
                "text-[11px] px-3 py-1 rounded-full border font-semibold transition-all",
                activeStatus === p.value
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-white border-slate-200 text-slate-500 hover:border-brand-primary",
              ].join(" ")}
              aria-pressed={activeStatus === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          startIcon={<IconDownload size={14} />}
          disabled={exporting}
          onClick={() =>
            handleExport({
              type,
              fromDate,
              toDate,
              exchangeId: exchangeId || undefined,
              status: activeStatus || undefined,
              bankId: activeBankId || undefined,
              search: activeSearch || undefined,
              page: 1,
              pageSize: 5000,
            })
          }
          className="h-8 text-xs"
        >
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Bank
          <select
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            aria-label="Filter by bank"
          >
            <option value="">All banks</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 md:col-span-2">
          Search
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
            placeholder="Search UTR / reference"
            aria-label="Search movements by UTR or reference"
          />
        </label>
        <div className="flex items-end gap-2">
          <Button type="button" size="sm" onClick={handleApply} className="h-9 text-xs">
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="h-9 text-xs"
          >
            Reset
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        {totalCount} record{totalCount === 1 ? "" : "s"} · {fromDate} → {toDate}
        {exchangeId ? " · exchange filtered" : ""}
        {" · "}
        Statement “Search ledgers” does not apply on this tab
      </p>

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
        getRowKey={(row) => (row as BalanceSheetMovementRow).id}
        showSearch={false}
        height="520px"
        compactDensity
        reloadToken={reloadToken}
      />
    </div>
  );
}
