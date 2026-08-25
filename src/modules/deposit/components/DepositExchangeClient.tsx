"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IconCheck,
  IconX,
  IconRefresh,
  IconCreditCard,
  IconUser,
  IconClock,
  IconCurrencyRupee,
  IconFileText,
} from "@tabler/icons-react";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldLabel } from "@/components/common/FieldLabel";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { DetailsSidebar } from "@/components/common/DetailsSidebar";
import { ConfirmSensitiveActionDialog } from "@/components/common/ConfirmSensitiveActionDialog";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import {
  createBulkExchangeApproveJob,
  exchangeActionApprove,
  exchangeActionMarkNotSettled,
  exchangeActionReject,
  exportDeposits,
  getBulkExchangeApproveJob,
  listDepositsNormalized,
  streamBulkExchangeApproveJobEvents,
} from "@/services/depositService";
import { isImportReadyDeposit } from "@/modules/deposit/depositImportReady";
import { useExport } from "@/hooks/useExport";
import { depositStatusApiParam, depositStatusColumnSelectValue } from "@/modules/deposit/depositListingStatusFilter";
import { getPlayerBonusProfile, listPlayerLookupOptions } from "@/services/lookupService";
import type { DepositBulkExchangeApproveJobSummary, DepositRow } from "@/types/deposit";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { userService } from "@/services/userService";
import { getApiErrorMessage } from "@/lib/apiError";
import { REASON_TYPES } from "@/lib/constants/reasonTypes";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { useApprovalQueueAutoRefresh } from "@/hooks/useApprovalQueueAutoRefresh";
import { formatDateTimeForUser } from "@/lib/userTimezone";

const COLUMN_FILTER_KEYS = [
  "utr",
  "utr_op",
  "bankName",
  "bankName_op",
  "bankId",
  "status",
  "amount",
  "amount_to",
  "amount_op",
  "totalAmount",
  "totalAmount_to",
  "totalAmount_op",
  "createdBy",
  "createdAt_from",
  "createdAt_to",
  "createdAt_op",
];

function toOptionalFilterValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function formatRelative(iso?: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function bonusAmountFromPercent(depositAmount: number, percent: number): string {
  const v = Math.round((depositAmount * percent) / 100);
  return String(v);
}

type ExchangeUserRow = {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
  name?: string;
};

function buildUserLabel(row: ExchangeUserRow): string {
  const fullName = row.fullName?.trim();
  const username = row.username?.trim();
  const name = row.name?.trim();
  if (fullName && username) return `${fullName} (${username})`;
  if (fullName) return fullName;
  if (username) return username;
  return name || "";
}

// ─── Deposit detail card (inside action sidebar) ───────────────────────────

type DepositDetailItem = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
};

function DepositDetailCard({ deposit }: { deposit: DepositRow }) {
  const { formatWholeMoney } = useFormatMoney();
  const items: DepositDetailItem[] = [
    {
      icon: <IconCreditCard className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Bank holder",
      value: deposit.bankName || "—",
    },
    {
      icon: <IconFileText className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "UTR",
      value: deposit.utr || "—",
      mono: true,
    },
    {
      icon: <IconCurrencyRupee className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Amount",
      value: formatWholeMoney(deposit.amount),
    },
    {
      icon: <IconClock className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Due time",
      value: formatRelative(deposit.entryAt ?? deposit.createdAt),
    },
    {
      icon: <IconClock className="size-4 shrink-0 text-gray-400" />,
      label: "Transaction at",
      value: formatDateTimeForUser(deposit.entryAt ?? deposit.createdAt),
    },
  ];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Deposit info
        </p>
        <TableStatusBadge status={deposit.status} />
      </div>
      <dl className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2.5">
            <span className="mt-0.5">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {item.label}
              </dt>
              <dd
                className={`mt-0.5 truncate text-sm font-medium text-gray-800 ${
                  item.mono ? "font-mono" : ""
                }`}
              >
                {item.value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      {deposit.status !== "pending" && deposit.status !== "not_settled" && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-amber-200">
          This deposit is not actionable in Exchange.
        </p>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function DepositExchangeClient() {
  const { formatWholeMoney } = useFormatMoney();
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    listingState;

  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRow | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [bonus, setBonus] = useState("0");
  const [playerBonusPercent, setPlayerBonusPercent] = useState<number | null>(null);
  const [bonusPercentSource, setBonusPercentSource] = useState<"first_deposit" | "regular" | null>(null);
  const bonusManuallyAdjustedRef = useRef(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReasonId, setRejectReasonId] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cachedUsers, setCachedUsers] = useState<Record<string, string>>({});
  const [visibleRows, setVisibleRows] = useState<DepositRow[]>([]);
  const [bulkSelection, setBulkSelection] = useState<Record<string, DepositRow>>({});
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkProgressOpen, setBulkProgressOpen] = useState(false);
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [bulkJobSelectionIds, setBulkJobSelectionIds] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState<DepositBulkExchangeApproveJobSummary | null>(null);

  useApprovalQueueAutoRefresh({
    module: "deposit",
    view: "exchange",
    onRefresh: () => setTableKey((k) => k + 1),
  });

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setTableKey((k) => k + 1);
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    let active = true;
    userService
      .list({ page: 1, limit: 500, sortBy: "fullName", sortOrder: "asc" })
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response?.data) ? (response.data as ExchangeUserRow[]) : [];
        setCachedUsers((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            const value = String(row._id ?? row.id ?? "").trim();
            const label = buildUserLabel(row);
            if (!value || !label) continue;
            next[value] = label;
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handlePlayerIdChange = useCallback((id: string) => {
    bonusManuallyAdjustedRef.current = false;
    setPlayerId(id);
  }, []);

  const loadPlayerOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const rows = await listPlayerLookupOptions({ q: query || undefined, limit: 25 });
      return rows
        .map((p) => ({
          value: String(p.id || "").trim(),
          label: `${p.playerId} · ${p.phone}`,
        }))
        .filter((o): o is AutocompleteOption => o.value.length > 0);
    } catch {
      return [];
    }
  }, []);

  const loadCreatedByOptions = useCallback(
    async (query: string): Promise<AutocompleteOption[]> => {
      try {
        const response = await userService.list({
          q: query || undefined,
          page: 1,
          limit: 20,
          sortBy: "fullName",
          sortOrder: "asc",
        });
        const rows = Array.isArray(response?.data) ? (response.data as ExchangeUserRow[]) : [];
        return rows
          .map((row) => {
            const value = String(row._id ?? row.id ?? "").trim();
            const label = buildUserLabel(row);
            if (!value || !label) return null;
            return { value, label };
          })
          .filter((row): row is AutocompleteOption => row !== null);
      } catch {
        return [];
      }
    },
    [],
  );

  const columnFilterValues = useMemo(
    () => ({
      ...filters,
      status: depositStatusColumnSelectValue(filters.status),
    }),
    [filters],
  );

  const handleColumnFilterChange = useCallback(
    (key: string, value: string) => {
      if (key === "status" && value === "") {
        setFilter("status", "all");
        return;
      }
      setFilter(key, value);
    },
    [setFilter],
  );

  const fetcher = useCallback(async (params: Record<string, unknown>) => {
    return listDepositsNormalized("exchange", params);
  }, []);

  const clearActionForm = useCallback(() => {
    bonusManuallyAdjustedRef.current = false;
    setSelectedDeposit(null);
    setPlayerId("");
    setBonus("0");
    setPlayerBonusPercent(null);
    setBonusPercentSource(null);
  }, []);

  const handleResetFilters = useCallback(() => {
    clearFilters({ keepQuickSearch: true });
    clearActionForm();
  }, [clearFilters, clearActionForm]);

  const { exporting, handleExport } = useExport((params) => exportDeposits("exchange", params), {
    fileName: `deposits-exchange-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      page: 1,
      limit: 10000,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
      utr: toOptionalFilterValue(filters.utr || ""),
      utr_op: toOptionalFilterValue(filters.utr_op || ""),
      bankName: toOptionalFilterValue(filters.bankName || ""),
      bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
      bankId: toOptionalFilterValue(filters.bankId || ""),
      status: depositStatusApiParam(filters.status),
      amount: toOptionalFilterValue(filters.amount || ""),
      amount_to: toOptionalFilterValue(filters.amount_to || ""),
      amount_op: toOptionalFilterValue(filters.amount_op || ""),
      totalAmount: toOptionalFilterValue(filters.totalAmount || ""),
      totalAmount_to: toOptionalFilterValue(filters.totalAmount_to || ""),
      totalAmount_op: toOptionalFilterValue(filters.totalAmount_op || ""),
      createdBy: toOptionalFilterValue(filters.createdBy || ""),
      createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
      createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
      createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
    });
  }, [handleExport, filters, sortBy, sortOrder]);

  const onApprove = useCallback(async () => {
    if (!selectedDeposit) {
      toast.error("Select a row in the table first.");
      return;
    }
    if (selectedDeposit.status !== "pending" && selectedDeposit.status !== "not_settled") {
      toast.error("Only pending or not settled deposits can be approved.");
      return;
    }
    if (!playerId.trim()) {
      toast.error("Select a player.");
      return;
    }
    const bonusNum = Number(bonus);
    if (Number.isNaN(bonusNum) || bonusNum < 0) {
      toast.error("Bonus must be a non-negative number.");
      return;
    }
    if (!Number.isInteger(bonusNum)) {
      toast.error("Bonus must be a whole number (no decimals).");
      return;
    }
    setActionLoading(selectedDeposit.id);
    try {
      await exchangeActionApprove(selectedDeposit.id, playerId.trim(), bonusNum);
      toast.success("Deposit settled and bank updated.");
      setTableKey((k) => k + 1);
      clearActionForm();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Approve failed."));
    } finally {
      setActionLoading(null);
    }
  }, [selectedDeposit, playerId, bonus, clearActionForm]);

  const confirmReject = useCallback(async () => {
    if (!selectedDeposit) return;
    if (!rejectReasonId.trim()) {
      toast.error("Select a rejection reason.");
      return;
    }
    const remark = rejectRemark.trim();
    setActionLoading(selectedDeposit.id);
    try {
      await exchangeActionReject(selectedDeposit.id, {
        reasonId: rejectReasonId.trim(),
        remark: remark || undefined,
      });
      toast.success("Deposit rejected.");
      setRejectOpen(false);
      setRejectReasonId("");
      setRejectRemark("");
      setTableKey((k) => k + 1);
      clearActionForm();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Reject failed."));
    } finally {
      setActionLoading(null);
    }
  }, [selectedDeposit, rejectReasonId, rejectRemark, clearActionForm]);

  const onMarkNotSettled = useCallback(async () => {
    if (!selectedDeposit) {
      toast.error("Select a row in the table first.");
      return;
    }
    if (selectedDeposit.status !== "pending") {
      toast.error("Only pending deposits can be marked not settled.");
      return;
    }
    setActionLoading(selectedDeposit.id);
    try {
      await exchangeActionMarkNotSettled(selectedDeposit.id);
      toast.success("Deposit marked as not settled.");
      setTableKey((k) => k + 1);
      clearActionForm();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Mark not settled failed."));
    } finally {
      setActionLoading(null);
    }
  }, [selectedDeposit, clearActionForm]);

  const handleRowClick = useCallback((row: unknown) => {
    const r = row as DepositRow;
    setSelectedDeposit(r);
    if (isImportReadyDeposit(r)) {
      bonusManuallyAdjustedRef.current = true;
      setPlayerId(r.playerMongoId!.trim());
      setBonus(String(Math.round(r.bonusAmount!)));
      setPlayerBonusPercent(null);
      setBonusPercentSource(null);
    } else {
      bonusManuallyAdjustedRef.current = false;
      setPlayerId("");
      setBonus("0");
      setPlayerBonusPercent(null);
      setBonusPercentSource(null);
    }
  }, []);

  const handleVisibleRowsChange = useCallback((rows: unknown[]) => {
    setVisibleRows(rows as DepositRow[]);
  }, []);

  const importReadyOnPage = useMemo(
    () => visibleRows.filter(isImportReadyDeposit),
    [visibleRows],
  );

  const bulkSelectedIds = useMemo(() => Object.keys(bulkSelection), [bulkSelection]);

  const bulkSelectedRows = useMemo(() => Object.values(bulkSelection), [bulkSelection]);

  const bulkSummary = useMemo(() => {
    const amountTotal = bulkSelectedRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const bonusTotal = bulkSelectedRows.reduce((sum, row) => sum + Number(row.bonusAmount ?? 0), 0);
    return {
      count: bulkSelectedRows.length,
      amountTotal,
      bonusTotal,
      grandTotal: amountTotal + bonusTotal,
      utrs: bulkSelectedRows.map((row) => row.utr).filter(Boolean),
    };
  }, [bulkSelectedRows]);

  const normalizedStatusFilter = (filters.status ?? "").trim().toLowerCase();
  const showBulkToolbar =
    normalizedStatusFilter === "" || normalizedStatusFilter === "pending" || normalizedStatusFilter === "all";

  const toggleBulkSelection = useCallback((row: DepositRow, checked: boolean) => {
    setBulkSelection((prev) => {
      const next = { ...prev };
      if (checked) next[row.id] = row;
      else delete next[row.id];
      return next;
    });
  }, []);

  const toggleSelectAllImportReadyOnPage = useCallback((checked: boolean) => {
    if (!checked) {
      setBulkSelection((prev) => {
        const next = { ...prev };
        for (const row of importReadyOnPage) delete next[row.id];
        return next;
      });
      return;
    }
    setBulkSelection((prev) => {
      const next = { ...prev };
      for (const row of importReadyOnPage) next[row.id] = row;
      return next;
    });
  }, [importReadyOnPage]);

  const allImportReadyOnPageSelected =
    importReadyOnPage.length > 0 && importReadyOnPage.every((row) => Boolean(bulkSelection[row.id]));

  const bulkProgressPercent = useMemo(() => {
    const total = Number(bulkProgress?.progress.totalRows ?? 0);
    const processed = Number(bulkProgress?.progress.processedRows ?? 0);
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((processed / total) * 100)));
  }, [bulkProgress]);

  const confirmBulkApprove = useCallback(async () => {
    if (bulkSelectedIds.length === 0) return;
    setBulkApproving(true);
    try {
      const created = await createBulkExchangeApproveJob(bulkSelectedIds);
      setBulkJobId(created.jobId);
      setBulkJobSelectionIds(bulkSelectedIds);
      setBulkProgressOpen(true);
      setBulkProgress((prev) => ({
        id: created.jobId,
        status: "queued",
        createdBy: prev?.createdBy ?? "",
        createdAt: prev?.createdAt ?? new Date().toISOString(),
        progress: { totalRows: bulkSelectedIds.length, processedRows: 0, successRows: 0, failedRows: 0 },
        errorSample: [],
      }));
      setBulkConfirmOpen(false);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Bulk approve failed."));
    } finally {
      setBulkApproving(false);
    }
  }, [bulkSelectedIds]);

  useEffect(() => {
    if (!bulkJobId) return;
    let mounted = true;
    let stopStream: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const applyProgress = (job: DepositBulkExchangeApproveJobSummary) => {
      if (!mounted) return;
      setBulkProgress(job);
      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        if (stopStream) {
          stopStream();
          stopStream = null;
        }
        setBulkSelection({});
        setTableKey((k) => k + 1);
        if (selectedDeposit && bulkJobSelectionIds.includes(selectedDeposit.id)) {
          clearActionForm();
        }
        if (job.status === "completed") {
          toast.success(
            `Settled ${job.progress.successRows} deposit${job.progress.successRows === 1 ? "" : "s"}${
              job.progress.failedRows > 0 ? `; ${job.progress.failedRows} failed` : ""
            }.`,
          );
        } else {
          toast.error(job.failureReason || "Bulk approval job failed.");
        }
      }
    };

    const pollOnce = async () => {
      try {
        const snapshot = await getBulkExchangeApproveJob(bulkJobId);
        applyProgress(snapshot);
      } catch {
        // Keep trying while stream/poll continues.
      }
    };

    void pollOnce();
    pollTimer = setInterval(() => {
      void pollOnce();
    }, 2000);

    void streamBulkExchangeApproveJobEvents(bulkJobId, (eventPayload) => {
      setBulkProgress((prev) => ({
        ...(prev ?? {
          id: bulkJobId,
          createdBy: "",
          createdAt: new Date().toISOString(),
          errorSample: [],
        }),
        ...eventPayload,
      }));
      if (eventPayload.status === "completed" || eventPayload.status === "failed" || eventPayload.status === "cancelled") {
        void pollOnce();
      }
    })
      .then((stop) => {
        stopStream = stop;
      })
      .catch(() => {
        // Poll fallback is already active.
      });

    return () => {
      mounted = false;
      if (pollTimer) clearInterval(pollTimer);
      if (stopStream) stopStream();
    };
  }, [bulkJobId, bulkJobSelectionIds, clearActionForm, selectedDeposit]);

  const getRowClassName = useCallback((row: unknown) => {
    return isImportReadyDeposit(row as DepositRow) ? "bg-green-50/90" : undefined;
  }, []);

  const playerDefaultOption = useMemo((): AutocompleteOption | null => {
    if (!playerId.trim() || !selectedDeposit?.playerMongoId) return null;
    if (selectedDeposit.playerMongoId !== playerId.trim()) return null;
    const label = selectedDeposit.playerIdLabel?.trim();
    if (!label) return null;
    return { value: playerId.trim(), label };
  }, [playerId, selectedDeposit]);

  useEffect(() => {
    let cancelled = false;
    const deposit = selectedDeposit;
    const pid = playerId.trim();
    if (!deposit || (deposit.status !== "pending" && deposit.status !== "not_settled") || !pid) {
      setPlayerBonusPercent(null);
      setBonusPercentSource(null);
      return;
    }

    void Promise.all([
      getPlayerBonusProfile(pid),
      listDepositsNormalized("exchange", {
        page: 1,
        limit: 1,
        player: pid,
        status: "all",
      }),
    ])
      .then(([p, priorDeposits]) => {
        if (cancelled) return;
        const hasPriorNonRejected = (priorDeposits.meta?.total ?? 0) > 0;
        const source: "first_deposit" | "regular" = hasPriorNonRejected ? "regular" : "first_deposit";
        const pct = Number(
          source === "first_deposit" ? p.firstDepositBonusPercentage : p.regularBonusPercentage,
        );
        setBonusPercentSource(source);
        setPlayerBonusPercent(Number.isFinite(pct) ? pct : null);
        if (!bonusManuallyAdjustedRef.current) {
          setBonus(bonusAmountFromPercent(deposit.amount, Number.isFinite(pct) ? pct : 0));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlayerBonusPercent(null);
          setBonusPercentSource(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDeposit?.id, selectedDeposit?.status, selectedDeposit?.amount, playerId]);

  const closeSidebar = useCallback(() => {
    clearActionForm();
  }, [clearActionForm]);

  const selectedId = selectedDeposit?.id ?? null;
  const loadingSelected = selectedDeposit ? actionLoading === selectedDeposit.id : false;
  const canApproveOnSelection =
    !!selectedDeposit &&
    (selectedDeposit.status === "pending" || selectedDeposit.status === "not_settled") &&
    !loadingSelected;
  const canMarkNotSettledOnSelection =
    !!selectedDeposit && selectedDeposit.status === "pending" && !loadingSelected;
  const canRejectOnSelection =
    !!selectedDeposit &&
    (selectedDeposit.status === "pending" || selectedDeposit.status === "not_settled") &&
    !loadingSelected;

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "_bulkSelect",
        label: "",
        sortable: false,
        minWidth: 44,
        render: (row: DepositRow) => {
          if (!isImportReadyDeposit(row)) return null;
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={Boolean(bulkSelection[row.id])}
                onChange={(e) => toggleBulkSelection(row, e.target.checked)}
                aria-label={`Select UTR ${row.utr}`}
              />
            </div>
          );
        },
      },
      {
        field: "bankName",
        label: "Bank holder",
        render: (row: DepositRow) => row.bankName,
        ...tableColumnPresets.nameCol,
        sortable: true,
        filterType: "text" as const,
        filterKey: "bankName",
        operatorKey: "bankName_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "utr",
        label: "UTR",
        render: (row: DepositRow) => (
          <span className="font-mono text-xs">{row.utr}</span>
        ),
        minWidth: 130,
        sortable: true,
        filterType: "text" as const,
        filterKey: "utr",
        operatorKey: "utr_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "amount",
        label: "Amount",
        render: (row: DepositRow) => (
          <span className="font-medium tabular-nums">
            {formatWholeMoney(row.amount)}
          </span>
        ),
        sortable: true,
        filterType: "number" as const,
        filterKey: "amount",
        filterKeyTo: "amount_to",
        operatorKey: "amount_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "status",
        label: "Status",
        filterType: "select" as const,
        filterKey: "status",
        filterOptions: [
          { label: "Pending", value: "pending" },
          { label: "Not Settled", value: "not_settled" },
          { label: "Verified", value: "verified" },
          { label: "Rejected", value: "rejected" },
          { label: "Finalized", value: "finalized" },
        ],
        ...tableColumnPresets.statusCol,
        render: (row: DepositRow) => <TableStatusBadge status={row.status} />,
      },
      {
        field: "due",
        label: "Due time",
        sortable: false,
        minWidth: 110,
        render: (row: DepositRow) => (
          <span className="text-xs text-gray-500">{formatRelative(row.entryAt ?? row.createdAt)}</span>
        ),
      },
      {
        field: "createdBy",
        label: "Created by",
        render: (row: DepositRow) => {
          const uid =
            typeof row.createdBy === "object" && row.createdBy && "_id" in row.createdBy
              ? String((row.createdBy as { _id: unknown })._id)
              : "";
          return row.createdByName || (uid ? cachedUsers[uid] : "") || "—";
        },
        minWidth: 160,
        filterType: "autocomplete" as const,
        filterKey: "createdBy",
        filterLoadOptions: loadCreatedByOptions,
        filterPlaceholder: "Search user",
        filterEmptyText: "No users found",
      },
      {
        field: "createdAt",
        label: "Transaction at",
        sortable: true,
        filterType: "date" as const,
        filterKey: "createdAt_from",
        filterKeyTo: "createdAt_to",
        operatorKey: "createdAt_op",
        ...tableColumnPresets.dateCol,
        render: (row: DepositRow) =>
          formatDateTimeForUser(row.entryAt ?? row.createdAt),
      },
      {
        field: "actions",
        label: "Action",
        sortable: false,
        minWidth: 96,
        render: (row: DepositRow) => {
          if (row.status !== "pending" && row.status !== "not_settled") {
            return <span className="text-xs text-gray-400">—</span>;
          }
          if (selectedId && row.id === selectedId) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <IconCheck className="size-3 shrink-0" aria-hidden />
                Selected
              </span>
            );
          }
          return (
            <span className="text-xs text-[var(--brand-primary)] underline-offset-2 hover:underline cursor-pointer">
              Click row
            </span>
          );
        },
      },
    ],
    [bulkSelection, cachedUsers, loadCreatedByOptions, selectedId, toggleBulkSelection],
  );

  return (
    <>
      <ListingPageContainer
        title="Deposit / Exchange depositor"
        description="Pending and not-settled banker deposits awaiting exchange action. Select a row to settle or reject."
        density="compact"
        fullWidth
        secondaryButtonLabel="Reset filters"
        onSecondaryClick={handleResetFilters}
        exportButtonLabel={exporting ? "Exporting…" : "Export"}
        onExportClick={onExportClick}
        exportDisabled={exporting}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Auto-refresh toggle */}
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoRefresh ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${autoRefresh ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
            </button>
            <span className="text-xs font-medium text-gray-600">
              Auto Refresh {autoRefresh ? <span className="text-green-600">(every 10s)</span> : "(off)"}
            </span>
          </div>

          {/* Prompt banner when no row is selected */}
          {!selectedDeposit && (
            <div className="mb-3 flex shrink-0 items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
              <IconUser className="size-4 shrink-0" />
              <span>
                <strong>Tip:</strong> Click any <strong>pending</strong> or <strong>not settled</strong> row to open the settle /
                reject panel.
              </span>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Quick status:</span>
            <Button
              type="button"
              size="xs"
              variant={filters.status === "all" ? "primary" : "secondary"}
              onClick={() => setFilter("status", "all")}
            >
              All
            </Button>
            <Button
              type="button"
              size="xs"
              variant={(filters.status || "") === "" || filters.status === "pending" ? "primary" : "secondary"}
              onClick={() => setFilter("status", "pending")}
            >
              Pending
            </Button>
            <Button
              type="button"
              size="xs"
              variant={filters.status === "not_settled" ? "primary" : "secondary"}
              onClick={() => setFilter("status", "not_settled")}
            >
              Not Settled
            </Button>
          </div>

          {showBulkToolbar && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  label="Current page selection"
                  checked={allImportReadyOnPageSelected}
                  onChange={(e) => toggleSelectAllImportReadyOnPage(e.target.checked)}
                  disabled={importReadyOnPage.length === 0}
                />
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  disabled={importReadyOnPage.length === 0}
                  onClick={() => toggleSelectAllImportReadyOnPage(true)}
                >
                  Select all green rows on this page ({importReadyOnPage.length})
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-600">
                  {importReadyOnPage.length} import-ready on page · {bulkSelectedIds.length} selected
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="success"
                  disabled={bulkSelectedIds.length === 0 || bulkApproving}
                  onClick={() => setBulkConfirmOpen(true)}
                >
                  Approve selected ({bulkSelectedIds.length})
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <PaginatedTableReference
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            height="calc(100vh - 280px)"
            showSearch={false}
            showPagination={false}
            onTotalChange={setTotalCount}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={{
              utr: toOptionalFilterValue(filters.utr || ""),
              utr_op: toOptionalFilterValue(filters.utr_op || ""),
              bankName: toOptionalFilterValue(filters.bankName || ""),
              bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
              bankId: toOptionalFilterValue(filters.bankId || ""),
              status: depositStatusApiParam(filters.status),
              amount: toOptionalFilterValue(filters.amount || ""),
              amount_to: toOptionalFilterValue(filters.amount_to || ""),
              amount_op: toOptionalFilterValue(filters.amount_op || ""),
              totalAmount: toOptionalFilterValue(filters.totalAmount || ""),
              totalAmount_to: toOptionalFilterValue(filters.totalAmount_to || ""),
              totalAmount_op: toOptionalFilterValue(filters.totalAmount_op || ""),
              createdBy: toOptionalFilterValue(filters.createdBy || ""),
              createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
              createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
              createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
            }}
            page={page}
            limit={limit}
            sortBy={sortBy || "createdAt"}
            sortOrder={sortOrder || "desc"}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            onSortChange={(field, order) => setSort(field, order)}
            onRowClick={handleRowClick}
            onRowsChange={handleVisibleRowsChange}
            getRowKey={(row) => String((row as DepositRow).id)}
            selectedRowKey={selectedId}
            getRowClassName={getRowClassName}
          />
          <PaginationControlsReference
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            rowsPerPageOptions={[10, 20, 50, 100, 200]}
          />
        </div>
      </ListingPageContainer>

      {/* ─── Action sidebar ─────────────────────────────────────────────── */}
      <DetailsSidebar
        open={!!selectedDeposit}
        title="Exchange Action"
        subtitle={
          selectedDeposit
            ? `UTR: ${selectedDeposit.utr ?? "—"}`
            : undefined
        }
        onClose={closeSidebar}
        width="400px"
      >
        {selectedDeposit && (
          <div className="flex flex-col gap-4">
            {/* Deposit info card */}
            <DepositDetailCard deposit={selectedDeposit} />

            {/* Player + bonus fields */}
            <div className="space-y-3">
              <div>
                <FieldLabel>
                  <span className="flex items-center gap-1.5">
                    <IconUser className="size-3.5" />
                    Player *
                  </span>
                </FieldLabel>
                <AutocompleteField
                  value={playerId}
                  onChange={handlePlayerIdChange}
                  loadOptions={loadPlayerOptions}
                  defaultOption={playerDefaultOption}
                  autoSelectSingleOption
                  placeholder="Search player…"
                  disabled={!canApproveOnSelection}
                />
                {!playerId && canApproveOnSelection && (
                  <p className="mt-1 text-xs text-amber-600">Player is required to approve.</p>
                )}
              </div>

              <div>
                <FieldLabel>
                  <span className="flex items-center gap-1.5">
                    <IconCurrencyRupee className="size-3.5" />
                    Bonus
                  </span>
                </FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={bonus}
                  onChange={(e) => {
                    bonusManuallyAdjustedRef.current = true;
                    setBonus(e.target.value);
                  }}
                  disabled={!canApproveOnSelection}
                  placeholder="0"
                />
                {playerBonusPercent !== null && canApproveOnSelection && (
                  <p className="mt-1 text-xs text-gray-500">
                    Applied {bonusPercentSource === "first_deposit" ? "First Deposit" : "Regular"} Bonus %:{" "}
                    {playerBonusPercent}%
                    {selectedDeposit && (
                      <>
                        {" "}
                        · Calculated:{" "}
                        {formatWholeMoney(Number(bonusAmountFromPercent(selectedDeposit.amount, playerBonusPercent)))}
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="success"
                startIcon={<IconCheck size={16} />}
                disabled={!canApproveOnSelection || !playerId.trim()}
                onClick={() => void onApprove()}
                className="w-full justify-center"
              >
                {loadingSelected ? "Settling…" : "Approve / Settle"}
              </Button>
              <Button
                type="button"
                variant="outline"
                startIcon={<IconClock size={16} />}
                disabled={!canMarkNotSettledOnSelection}
                onClick={() => void onMarkNotSettled()}
                className="w-full justify-center"
              >
                Mark Not Settled
              </Button>
              <Button
                type="button"
                variant="danger"
                startIcon={<IconX size={16} />}
                disabled={!canRejectOnSelection}
                onClick={() => {
                  if (
                    !selectedDeposit ||
                    (selectedDeposit.status !== "pending" && selectedDeposit.status !== "not_settled")
                  ) {
                    return;
                  }
                  setRejectOpen(true);
                  setRejectReasonId("");
                  setRejectRemark("");
                }}
                className="w-full justify-center"
              >
                Reject
              </Button>
              <Button
                type="button"
                variant="secondary"
                startIcon={<IconRefresh size={16} />}
                onClick={closeSidebar}
                className="w-full justify-center"
              >
                Clear selection
              </Button>
            </div>
          </div>
        )}
      </DetailsSidebar>

      {bulkProgressOpen && bulkProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="card w-full max-w-lg space-y-4 p-4">
            <h3 className="text-lg font-semibold">Bulk settlement progress</h3>
            <div className="space-y-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${bulkProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  {bulkProgress.progress.processedRows}/{bulkProgress.progress.totalRows} processed
                </span>
                <span>{bulkProgressPercent}%</span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-gray-500">Success</dt>
              <dd className="text-right font-semibold tabular-nums text-emerald-700">
                {bulkProgress.progress.successRows}
              </dd>
              <dt className="text-gray-500">Failed</dt>
              <dd className="text-right font-semibold tabular-nums text-red-600">
                {bulkProgress.progress.failedRows}
              </dd>
              <dt className="text-gray-500">Status</dt>
              <dd className="text-right font-medium capitalize">{bulkProgress.status}</dd>
            </dl>
            {bulkProgress.errorSample.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <p className="mb-1 font-medium">Failure sample</p>
                <p className="break-all">
                  {bulkProgress.errorSample
                    .slice(0, 3)
                    .map((item) => item.error)
                    .join("; ")}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setBulkProgressOpen(false)}
                disabled={bulkProgress.status === "processing" || bulkProgress.status === "queued"}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="card w-full max-w-lg space-y-4 p-4">
            <h3 className="text-lg font-semibold">Approve import-ready deposits</h3>
            <p className="text-sm text-gray-600">
              You are about to settle <strong>{bulkSummary.count}</strong> pending deposit
              {bulkSummary.count === 1 ? "" : "s"} using the player and bonus already stored from import.
            </p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-gray-500">Deposit amount</dt>
              <dd className="text-right font-medium tabular-nums">{formatWholeMoney(bulkSummary.amountTotal)}</dd>
              <dt className="text-gray-500">Bonus total</dt>
              <dd className="text-right font-medium tabular-nums">{formatWholeMoney(bulkSummary.bonusTotal)}</dd>
              <dt className="text-gray-500">Grand total</dt>
              <dd className="text-right font-semibold tabular-nums">{formatWholeMoney(bulkSummary.grandTotal)}</dd>
            </dl>
            {bulkSummary.utrs.length > 0 && (
              <div className="rounded-md border border-[var(--border)] bg-slate-50 px-3 py-2 text-xs text-gray-700">
                <p className="mb-1 font-medium">UTRs</p>
                <p className="font-mono break-all">
                  {bulkSummary.utrs.slice(0, 5).join(", ")}
                  {bulkSummary.utrs.length > 5 ? ` … and ${bulkSummary.utrs.length - 5} more` : ""}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                disabled={bulkApproving}
                onClick={() => setBulkConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                loading={bulkApproving}
                onClick={() => void confirmBulkApprove()}
              >
                Confirm and settle all
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reject confirmation dialog ──────────────────────────────────── */}
      <ConfirmSensitiveActionDialog
        title="Reject deposit"
        open={rejectOpen}
        reasonType={REASON_TYPES.DEPOSIT_EXCHANGE_REJECT}
        selectedReasonId={rejectReasonId}
        onReasonIdChange={setRejectReasonId}
        remark={rejectRemark}
        onRemarkChange={setRejectRemark}
        onCancel={() => {
          setRejectOpen(false);
          setRejectReasonId("");
          setRejectRemark("");
        }}
        onConfirm={() => void confirmReject()}
      />
    </>
  );
}
