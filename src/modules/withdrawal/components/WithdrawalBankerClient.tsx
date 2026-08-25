"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IconCheck,
  IconX,
  IconUser,
  IconCreditCard,
  IconFileText,
  IconCurrencyRupee,
  IconClock,
  IconRefresh,
  IconBuildingBank,
} from "@tabler/icons-react";
import { ConfirmSensitiveActionDialog } from "@/components/common/ConfirmSensitiveActionDialog";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FieldError } from "@/components/common/FieldError";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { DetailsSidebar } from "@/components/common/DetailsSidebar";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { getApiErrorMessage } from "@/lib/apiError";
import { REASON_TYPES } from "@/lib/constants/reasonTypes";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import {
  createBulkBankerApproveJob,
  getBulkBankerApproveJob,
  listWithdrawalsNormalized,
  patchWithdrawalStatus,
  streamBulkBankerApproveJobEvents,
  updateWithdrawalBankerPayout,
  exportWithdrawals,
} from "@/services/withdrawalService";
import { useExport } from "@/hooks/useExport";
import { listBankLookupOptions } from "@/services/lookupService";
import { listLiabilityPersonsNormalized } from "@/services/liabilityService";
import { userService } from "@/services/userService";
import type { WithdrawalBankerPayoutInput, WithdrawalBulkApproveJobSummary, WithdrawalRow } from "@/types/withdrawal";
import { formatDateTimeForUser } from "@/lib/userTimezone";
import { useApprovalQueueAutoRefresh } from "@/hooks/useApprovalQueueAutoRefresh";
import { isImportReadyWithdrawal } from "@/modules/withdrawal/withdrawalImportReady";

const COLUMN_FILTER_KEYS = [
  "utr",
  "utr_op",
  "playerName",
  "playerName_op",
  "bankName",
  "bankName_op",
  "amount",
  "amount_to",
  "amount_op",
  "createdBy",
  "approvedBy",
  "createdAt_from",
  "createdAt_to",
  "createdAt_op",
];

function toOptionalFilterValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

type UserRow = {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
};

function buildUserLabel(row: UserRow): string {
  const fn = row.fullName?.trim();
  const un = row.username?.trim();
  if (fn && un) return `${fn} (${un})`;
  return fn || un || "";
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

// ─── Detail card for sidebar ──────────────────────────────────────────────

function WithdrawalDetailCard({ withdrawal }: { withdrawal: WithdrawalRow }) {
  const { formatWholeMoney } = useFormatMoney();
  const items = [
    {
      icon: <IconUser className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Player",
      value: withdrawal.playerName || "—",
    },
    {
      icon: <IconCreditCard className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Acc No (Dest)",
      value: withdrawal.accountNumber || "—",
    },
    {
      icon: <IconFileText className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Bank (Dest)",
      value: withdrawal.bankName || "—",
    },
    {
      icon: <IconCurrencyRupee className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Payable amount",
      value: withdrawal.payableAmount != null ? formatWholeMoney(withdrawal.payableAmount) : "—",
    },
    {
      icon: <IconClock className="size-4 shrink-0 text-gray-400" />,
      label: "Requested at",
      value: formatDateTimeForUser(withdrawal.requestedAt ?? withdrawal.createdAt),
    },
    {
      icon: <IconBuildingBank className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Company payout source",
      value:
        withdrawal.payoutSettlementType === "person"
          ? withdrawal.payoutLiabilityPersonName?.trim()
            ? `LP: ${withdrawal.payoutLiabilityPersonName.trim()}`
            : "—"
          : withdrawal.payoutBankName?.trim() || "(pending)",
    },
  ];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Withdrawal Info</p>
        <TableStatusBadge status={withdrawal.status} />
      </div>
      <dl className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2.5">
            <span className="mt-0.5">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-800 truncate">{item.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function WithdrawalBankerClient() {
  const { formatWholeMoney } = useFormatMoney();
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    listingState;

  const withdrawalTableColumnFilterValues = useMemo(() => ({ ...filters }), [filters]);

  const withdrawalTableFilterParams = useMemo(
    () => ({
      utr: toOptionalFilterValue(filters.utr || ""),
      utr_op: toOptionalFilterValue(filters.utr_op || ""),
      playerName: toOptionalFilterValue(filters.playerName || ""),
      playerName_op: toOptionalFilterValue(filters.playerName_op || ""),
      bankName: toOptionalFilterValue(filters.bankName || ""),
      bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
      status: toOptionalFilterValue(filters.status || ""),
      amount: toOptionalFilterValue(filters.amount || ""),
      amount_to: toOptionalFilterValue(filters.amount_to || ""),
      amount_op: toOptionalFilterValue(filters.amount_op || ""),
      createdBy: toOptionalFilterValue(filters.createdBy || ""),
      approvedBy: toOptionalFilterValue(filters.approvedBy || ""),
      createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
      createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
      createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
    }),
    [filters],
  );

  const handleWithdrawalColumnFilterChange = useCallback(
    (key: string, value: string) => {
      setFilter(key, value);
    },
    [setFilter],
  );

  const { exporting, handleExport } = useExport((params) => exportWithdrawals(params), {
    fileName: `withdrawals-banker-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      view: "banker",
      page: 1,
      limit: 10000,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
      utr: toOptionalFilterValue(filters.utr || ""),
      utr_op: toOptionalFilterValue(filters.utr_op || ""),
      playerName: toOptionalFilterValue(filters.playerName || ""),
      playerName_op: toOptionalFilterValue(filters.playerName_op || ""),
      bankName: toOptionalFilterValue(filters.bankName || ""),
      bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
      status: toOptionalFilterValue(filters.status || ""),
      amount: toOptionalFilterValue(filters.amount || ""),
      amount_to: toOptionalFilterValue(filters.amount_to || ""),
      amount_op: toOptionalFilterValue(filters.amount_op || ""),
      createdBy: toOptionalFilterValue(filters.createdBy || ""),
      approvedBy: toOptionalFilterValue(filters.approvedBy || ""),
      createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
      createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
      createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
    });
  }, [handleExport, filters, sortBy, sortOrder]);

  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRow | null>(null);
  const [visibleRows, setVisibleRows] = useState<WithdrawalRow[]>([]);
  const [bulkSelection, setBulkSelection] = useState<Record<string, WithdrawalRow>>({});
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkProgressOpen, setBulkProgressOpen] = useState(false);
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [bulkJobSelectionIds, setBulkJobSelectionIds] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState<WithdrawalBulkApproveJobSummary | null>(null);

  useApprovalQueueAutoRefresh({
    module: "withdrawal",
    view: "banker",
    onRefresh: () => setTableKey((k) => k + 1),
  });

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setTableKey((k) => k + 1);
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const [payoutSettlementType, setPayoutSettlementType] = useState<"bank" | "person">("bank");
  const [bankId, setBankId] = useState("");
  const [bankAutocompleteDefault, setBankAutocompleteDefault] = useState<AutocompleteOption | null>(null);
  const [liabilityPersonId, setLiabilityPersonId] = useState("");
  const [payoutPersonAutocompleteDefault, setPayoutPersonAutocompleteDefault] = useState<AutocompleteOption | null>(null);
  const bankIdRef = useRef("");
  const hasConsumedInitialListMetaRef = useRef(false);

  useEffect(() => {
    bankIdRef.current = bankId;
  }, [bankId]);

  const withdrawalBankerFetcher = useCallback(async (params: Record<string, unknown>) => {
    const res = await listWithdrawalsNormalized("banker", params);
    if (!hasConsumedInitialListMetaRef.current) {
      hasConsumedInitialListMetaRef.current = true;
      const hint = res.meta.lastBankerPayout;
      if (hint?.bankId && bankIdRef.current === "") {
        setBankId(hint.bankId);
        setBankAutocompleteDefault({ value: hint.bankId, label: hint.bankName });
      }
    }
    return res;
  }, []);

  const [utr, setUtr] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReasonId, setRejectReasonId] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errors, setErrors] = useState<{ bankId?: string; liabilityPersonId?: string; utr?: string }>({});

  const loadUserOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await userService.list({
        q: query || undefined,
        page: 1,
        limit: 20,
        sortBy: "fullName",
        sortOrder: "asc",
      });
      const rows = Array.isArray(response?.data) ? (response.data as UserRow[]) : [];
      return rows
        .map((row) => ({
          value: String(row._id ?? row.id ?? "").trim(),
          label: buildUserLabel(row),
        }))
        .filter((o) => o.value.length > 0 && o.label.length > 0);
    } catch {
      return [];
    }
  }, []);

  const loadBankOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const rows = await listBankLookupOptions({ q: query || undefined, limit: 25 });
      return rows.map((b) => ({
        value: b.id,
        label: b.label,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadLiabilityPersonOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const res = await listLiabilityPersonsNormalized({
        page: 1,
        limit: 25,
        q: query || undefined,
        sortBy: "name",
        sortOrder: "asc",
        isActive: "true",
      });
      return res.data.map((p) => ({ value: p.id, label: p.name }));
    } catch {
      return [];
    }
  }, []);

  const closeSidebar = useCallback(() => {
    setSelectedWithdrawal(null);
    setPayoutSettlementType("bank");
    setLiabilityPersonId("");
    setPayoutPersonAutocompleteDefault(null);
    setUtr("");
    setRejectOpen(false);
    setRejectReasonId("");
    setRejectRemark("");
    setErrors({});
  }, []);

  const handleRowClick = useCallback((row: unknown) => {
    const r = row as WithdrawalRow;
    setSelectedWithdrawal(r);
    if (isImportReadyWithdrawal(r)) {
      setUtr(r.utr?.trim() || "");
      const mode = r.payoutSettlementType === "person" ? "person" : "bank";
      setPayoutSettlementType(mode);
      if (mode === "bank" && r.payoutBankId?.trim()) {
        setBankId(r.payoutBankId.trim());
        setBankAutocompleteDefault({
          value: r.payoutBankId.trim(),
          label: r.payoutBankName?.trim() || r.payoutBankId.trim(),
        });
        setLiabilityPersonId("");
        setPayoutPersonAutocompleteDefault(null);
      } else if (mode === "person" && r.payoutLiabilityPersonId?.trim()) {
        setLiabilityPersonId(r.payoutLiabilityPersonId.trim());
        setPayoutPersonAutocompleteDefault({
          value: r.payoutLiabilityPersonId.trim(),
          label: r.payoutLiabilityPersonName?.trim() || r.payoutLiabilityPersonId.trim(),
        });
      }
    } else {
      setUtr("");
    }
  }, []);

  const handleVisibleRowsChange = useCallback((rows: unknown[]) => {
    setVisibleRows(rows as WithdrawalRow[]);
  }, []);

  const importReadyOnPage = useMemo(
    () => visibleRows.filter(isImportReadyWithdrawal),
    [visibleRows],
  );

  const bulkSelectedIds = useMemo(() => Object.keys(bulkSelection), [bulkSelection]);
  const bulkSelectedRows = useMemo(() => Object.values(bulkSelection), [bulkSelection]);

  const bulkSummary = useMemo(() => {
    const payableTotal = bulkSelectedRows.reduce((sum, row) => sum + Number(row.payableAmount ?? row.amount ?? 0), 0);
    return {
      count: bulkSelectedRows.length,
      payableTotal,
      utrs: bulkSelectedRows.map((row) => row.utr).filter(Boolean) as string[],
    };
  }, [bulkSelectedRows]);

  const normalizedStatusFilter = (filters.status ?? "").trim().toLowerCase();
  const showBulkToolbar =
    normalizedStatusFilter === "" || normalizedStatusFilter === "requested" || normalizedStatusFilter === "all";

  const toggleBulkSelection = useCallback((row: WithdrawalRow, checked: boolean) => {
    setBulkSelection((prev) => {
      const next = { ...prev };
      if (checked) next[row.id] = row;
      else delete next[row.id];
      return next;
    });
  }, []);

  const toggleSelectAllImportReadyOnPage = useCallback(
    (checked: boolean) => {
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
    },
    [importReadyOnPage],
  );

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
      const created = await createBulkBankerApproveJob(bulkSelectedIds);
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

    const applyProgress = (job: WithdrawalBulkApproveJobSummary) => {
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
        if (selectedWithdrawal && bulkJobSelectionIds.includes(selectedWithdrawal.id)) {
          closeSidebar();
        }
        if (job.status === "completed") {
          toast.success(
            `Approved ${job.progress.successRows} withdrawal${job.progress.successRows === 1 ? "" : "s"}${
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
        const snapshot = await getBulkBankerApproveJob(bulkJobId);
        applyProgress(snapshot);
      } catch {
        // Keep trying while stream/poll continues.
      }
    };

    void pollOnce();
    pollTimer = setInterval(() => {
      void pollOnce();
    }, 2000);

    void streamBulkBankerApproveJobEvents(bulkJobId, (eventPayload) => {
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
  }, [bulkJobId, bulkJobSelectionIds, closeSidebar, selectedWithdrawal]);

  const getRowClassName = useCallback((row: unknown) => {
    return isImportReadyWithdrawal(row as WithdrawalRow) ? "bg-green-50/90" : undefined;
  }, []);

  const onPayoutSubmit = async () => {
    if (!selectedWithdrawal) return;
    const next: typeof errors = {};
    if (payoutSettlementType === "bank" && !bankId.trim()) next.bankId = "Payout bank is required.";
    if (payoutSettlementType === "person" && !liabilityPersonId.trim()) {
      next.liabilityPersonId = "Liability person is required.";
    }
    if (!utr.trim()) next.utr = "UTR reference is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body: WithdrawalBankerPayoutInput =
      payoutSettlementType === "bank"
        ? { payoutSettlementType: "bank", bankId: bankId.trim(), utr: utr.trim() }
        : { payoutSettlementType: "person", liabilityPersonId: liabilityPersonId.trim(), utr: utr.trim() };

    setActionLoading(true);
    try {
      await updateWithdrawalBankerPayout(selectedWithdrawal.id, body);
      toast.success("Payout recorded successfully.");
      closeSidebar();
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to record payout"));
    } finally {
      setActionLoading(false);
    }
  };

  const onRejectSubmit = async () => {
    if (!selectedWithdrawal) return;
    if (!rejectReasonId.trim()) {
      toast.error("Select a rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      await patchWithdrawalStatus(selectedWithdrawal.id, {
        status: "rejected",
        reasonId: rejectReasonId.trim(),
        remark: rejectRemark.trim() || undefined,
      });
      toast.success("Withdrawal rejected.");
      setRejectOpen(false);
      setRejectReasonId("");
      setRejectRemark("");
      closeSidebar();
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to reject withdrawal"));
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "_bulkSelect",
        label: "",
        sortable: false,
        minWidth: 44,
        render: (row: WithdrawalRow) => {
          if (!isImportReadyWithdrawal(row)) return null;
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={Boolean(bulkSelection[row.id])}
                onChange={(e) => toggleBulkSelection(row, e.target.checked)}
                aria-label={`Select payout UTR ${row.utr}`}
              />
            </div>
          );
        },
      },
      {
        field: "playerName",
        label: "Player",
        render: (row: WithdrawalRow) => row.playerName,
        ...tableColumnPresets.nameCol,
        sortable: true,
        filterType: "text" as const,
        filterKey: "playerName",
        operatorKey: "playerName_op",
      },
      {
        field: "account",
        label: "Destination Account",
        minWidth: 200,
        sortable: false,
        filterType: "text" as const,
        filterKey: "bankName",
        operatorKey: "bankName_op",
        filterPlaceholder: "Search bank...",
        render: (row: WithdrawalRow) => (
          <div className="text-sm">
            <div className="font-mono text-xs">{row.accountNumber || "—"}</div>
            <div className="text-xs text-gray-500">{row.bankName}</div>
          </div>
        ),
      },
      {
        field: "payableAmount",
        label: "Payable",
        render: (row: WithdrawalRow) => (row.payableAmount != null ? formatWholeMoney(row.payableAmount) : "—"),
        sortable: true,
        minWidth: 100,
        filterType: "number" as const,
        filterKey: "amount",
        filterKeyTo: "amount_to",
        operatorKey: "amount_op",
      },
      {
        field: "status",
        label: "Status",
        ...tableColumnPresets.statusCol,
        render: (row: WithdrawalRow) => <TableStatusBadge status={row.status} />,
        sortable: true,
        filterType: "select" as const,
        filterKey: "status",
        filterOptions: [
          { value: "requested", label: "Requested" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "finalized", label: "Finalized" },
        ],
      },
      {
        field: "payoutSource",
        label: "Payout via",
        sortable: false,
        minWidth: 140,
        render: (row: WithdrawalRow) =>
          row.payoutSettlementType === "person" && row.payoutLiabilityPersonName?.trim()
            ? `LP: ${row.payoutLiabilityPersonName.trim()}`
            : row.payoutBankName?.trim()
              ? row.payoutBankName.trim()
              : "—",
      },
      {
        field: "createdBy",
        label: "Created By",
        render: (row: WithdrawalRow) => row.createdByName || "—",
        minWidth: 150,
        sortable: false,
        filterType: "autocomplete" as const,
        filterKey: "createdBy",
        filterLoadOptions: loadUserOptions,
      },
      {
        field: "approvedBy",
        label: "Approved By",
        render: (row: WithdrawalRow) => row.approvedByName || "—",
        minWidth: 150,
        sortable: false,
        filterType: "autocomplete" as const,
        filterKey: "approvedBy",
        filterLoadOptions: loadUserOptions,
      },
      {
        field: "due",
        label: "Due time",
        sortable: false,
        minWidth: 110,
        render: (row: WithdrawalRow) => (
          <span className="text-xs text-gray-500">{formatRelative(row.requestedAt ?? row.createdAt)}</span>
        ),
      },
      {
        field: "createdAt",
        label: "Requested At",
        sortable: true,
        filterType: "date" as const,
        filterKey: "createdAt_from",
        filterKeyTo: "createdAt_to",
        operatorKey: "createdAt_op",
        ...tableColumnPresets.dateCol,
        render: (row: WithdrawalRow) =>
          formatDateTimeForUser(row.requestedAt ?? row.createdAt),
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        minWidth: 96,
        render: (row: WithdrawalRow) => {
          if (row.status !== "requested") return <span className="text-xs text-gray-400">—</span>;
          if (selectedWithdrawal?.id === row.id) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <IconCheck size={12} className="shrink-0" />
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
    [selectedWithdrawal, loadUserOptions, bulkSelection, toggleBulkSelection],
  );

  return (
    <>
      <ListingPageContainer
        title="Withdrawal / Banker"
        description="Pending exchange withdrawals awaiting payout bank and UTR. Click a row to open the sidebar for payout action."
        density="compact"
        fullWidth
        secondaryButtonLabel="Reset filters"
        onSecondaryClick={() => clearFilters({ keepQuickSearch: true })}
        exportButtonLabel="Export"
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

          {!selectedWithdrawal && (
            <div className="mb-3 flex shrink-0 items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
              <IconUser className="size-4 shrink-0" />
              <span>
                <strong>Tip:</strong> Click any <strong>requested</strong> row to open the sidebar.
              </span>
            </div>
          )}

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

          <PaginatedTableReference
            reloadToken={tableKey}
            columns={columns}
            fetcher={withdrawalBankerFetcher}
            height="calc(100vh - 280px)"
            showSearch={false}
            showPagination={false}
            onTotalChange={setTotalCount}
            columnFilterValues={withdrawalTableColumnFilterValues}
            onColumnFilterChange={handleWithdrawalColumnFilterChange}
            filterParams={withdrawalTableFilterParams}
            page={page}
            limit={limit}
            sortBy={sortBy || "createdAt"}
            sortOrder={sortOrder || "desc"}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            onSortChange={(field, order) => setSort(field, order)}
            onRowClick={handleRowClick}
            onRowsChange={handleVisibleRowsChange}
            getRowClassName={getRowClassName}
            selectedRowKey={selectedWithdrawal?.id ?? null}
            getRowKey={(row) => String((row as WithdrawalRow).id)}
            compactDensity
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

      <DetailsSidebar
        open={!!selectedWithdrawal}
        title="Withdrawal Banker"
        subtitle={selectedWithdrawal ? `Player: ${selectedWithdrawal.playerName}` : undefined}
        onClose={closeSidebar}
        width="400px"
      >
        {selectedWithdrawal && (
          <div className="flex flex-col gap-6">
            <WithdrawalDetailCard withdrawal={selectedWithdrawal} />

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">Payout settlement *</FieldLabel>
                  <select
                    className="w-full h-9 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
                    value={payoutSettlementType}
                    onChange={(e) => {
                      const v = e.target.value === "person" ? "person" : "bank";
                      setPayoutSettlementType(v);
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.bankId;
                        delete n.liabilityPersonId;
                        return n;
                      });
                    }}
                    disabled={selectedWithdrawal.status !== "requested" || actionLoading}
                  >
                    <option value="bank">Bank</option>
                    <option value="person">Liability person</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">UTR Reference *</FieldLabel>
                  <Input
                    className="h-9 text-sm"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="Enter UTR"
                    disabled={selectedWithdrawal.status !== "requested" || actionLoading}
                  />
                  <FieldError message={errors.utr} />
                </div>
              </div>

              {payoutSettlementType === "bank" ? (
                <div className="space-y-1">
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">Company payout bank *</FieldLabel>
                  <AutocompleteField
                    value={bankId}
                    onChange={setBankId}
                    loadOptions={loadBankOptions}
                    placeholder="Select bank..."
                    emptyText="No banks found"
                    defaultOption={bankAutocompleteDefault}
                    disabled={selectedWithdrawal.status !== "requested" || actionLoading}
                  />
                  <FieldError message={errors.bankId} />
                </div>
              ) : (
                <div className="space-y-1">
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">Liability person paying out *</FieldLabel>
                  <AutocompleteField
                    value={liabilityPersonId}
                    onChange={setLiabilityPersonId}
                    loadOptions={loadLiabilityPersonOptions}
                    placeholder="Search liability person..."
                    emptyText="No persons found"
                    defaultOption={payoutPersonAutocompleteDefault}
                    disabled={selectedWithdrawal.status !== "requested" || actionLoading}
                  />
                  <FieldError message={errors.liabilityPersonId} />
                </div>
              )}



              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
                <Button
                  variant="success"
                  startIcon={<IconCheck size={18} />}
                  onClick={() => void onPayoutSubmit()}
                  disabled={selectedWithdrawal.status !== "requested" || actionLoading}
                  className="w-full justify-center"
                >
                  {actionLoading ? "Processing…" : "Record Payout"}
                </Button>
                <Button
                  variant="danger"
                  startIcon={<IconX size={18} />}
                  onClick={() => {
                    setRejectOpen(true);
                    setRejectReasonId("");
                    setRejectRemark("");
                  }}
                  disabled={selectedWithdrawal.status !== "requested" || actionLoading}
                  className="w-full justify-center"
                >
                  Reject
                </Button>
                <Button
                  variant="secondary"
                  startIcon={<IconRefresh size={18} />}
                  onClick={closeSidebar}
                  className="w-full justify-center"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        )}
      </DetailsSidebar>

      {bulkConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="card w-full max-w-lg space-y-4 p-4">
            <h3 className="text-lg font-semibold">Approve import-ready withdrawals</h3>
            <p className="text-sm text-gray-600">
              You are about to record payout for <strong>{bulkSummary.count}</strong> requested withdrawal
              {bulkSummary.count === 1 ? "" : "s"} using payout UTR and bank/person stored from import.
            </p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-gray-500">Payable total</dt>
              <dd className="text-right font-semibold tabular-nums">{formatWholeMoney(bulkSummary.payableTotal)}</dd>
            </dl>
            {bulkSummary.utrs.length > 0 && (
              <div className="rounded-md border border-[var(--border)] bg-slate-50 px-3 py-2 text-xs text-gray-700">
                <p className="mb-1 font-medium">Payout UTRs</p>
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
                Confirm and approve all
              </Button>
            </div>
          </div>
        </div>
      )}

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

      <ConfirmSensitiveActionDialog
        title="Reject withdrawal"
        open={rejectOpen}
        reasonType={REASON_TYPES.WITHDRAWAL_BANKER_REJECT}
        selectedReasonId={rejectReasonId}
        onReasonIdChange={setRejectReasonId}
        remark={rejectRemark}
        onRemarkChange={setRejectRemark}
        onCancel={() => {
          setRejectOpen(false);
          setRejectReasonId("");
          setRejectRemark("");
        }}
        onConfirm={() => void onRejectSubmit()}
      />
    </>
  );
}
