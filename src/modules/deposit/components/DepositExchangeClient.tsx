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
import { FormActions, FormContainer } from "@/components/common/FormContainer";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FieldError } from "@/components/common/FieldError";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { DetailsSidebar } from "@/components/common/DetailsSidebar";
import { ConfirmSensitiveActionDialog } from "@/components/common/ConfirmSensitiveActionDialog";
import {
  OperatedMoneyFields,
  defaultOperatedMoneyValue,
  toMoneyFxPayload,
} from "@/components/common/OperatedMoneyFields";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { getCurrencyMinUnit } from "@/lib/currencies";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import {
  createDeposit,
  exchangeActionApprove,
  exchangeActionMarkNotSettled,
  exchangeActionReject,
  exportDeposits,
  listDepositsNormalized,
} from "@/services/depositService";
import { useExport } from "@/hooks/useExport";
import { depositStatusApiParam, depositStatusColumnSelectValue } from "@/modules/deposit/depositListingStatusFilter";
import { listBankLookupOptions, listPlayerLookupOptions } from "@/services/lookupService";
import { listLiabilityPersonsNormalized } from "@/services/liabilityService";
import type { DepositCreateInput, DepositRow } from "@/types/deposit";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { userService } from "@/services/userService";
import { getApiErrorMessage } from "@/lib/apiError";
import { REASON_TYPES } from "@/lib/constants/reasonTypes";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { useApprovalQueueAutoRefresh } from "@/hooks/useApprovalQueueAutoRefresh";
import { currentDateTimeLocalValue, formatDateTimeForUser } from "@/lib/userTimezone";
import { DepositImportDialog } from "./DepositImportDialog";

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
      label: "Reference Number",
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
  const { platformCurrency } = usePlatformSettings();
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    listingState;

  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRow | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReasonId, setRejectReasonId] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cachedUsers, setCachedUsers] = useState<Record<string, string>>({});

  // ─── Single-stage create form ─────────────────────────────────────────────
  const [settlementAccountType, setSettlementAccountType] = useState<"bank" | "person">("bank");
  const [bankId, setBankId] = useState("");
  const [bankAutocompleteDefault, setBankAutocompleteDefault] = useState<AutocompleteOption | null>(null);
  const [liabilityPersonId, setLiabilityPersonId] = useState("");
  const [personAutocompleteDefault, setPersonAutocompleteDefault] = useState<AutocompleteOption | null>(null);
  const bankIdRef = useRef(bankId);
  const hasConsumedInitialListMetaRef = useRef(false);
  const [utr, setUtr] = useState("");
  const [money, setMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [entryAt, setEntryAt] = useState(currentDateTimeLocalValue());
  const [createPlayerId, setCreatePlayerId] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createErrors, setCreateErrors] = useState<{
    bankId?: string;
    liabilityPersonId?: string;
    utr?: string;
    amount?: string;
    playerId?: string;
  }>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    bankIdRef.current = bankId;
  }, [bankId]);

  useEffect(() => {
    if (!platformCurrency) return;
    setMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency]);

  useApprovalQueueAutoRefresh({
    module: "deposit",
    view: "exchange",
    onRefresh: () => setTableKey((k) => k + 1),
  });

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
    setPlayerId(id);
  }, []);

  const handleCreatePlayerIdChange = useCallback((id: string) => {
    setCreatePlayerId(id);
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

  // Empty URL status defaults to All on exchange (verified creates would be hidden under Pending).
  const exchangeStatusForApi = !filters.status?.trim() ? "all" : filters.status;

  const columnFilterValues = useMemo(
    () => ({
      ...filters,
      status: depositStatusColumnSelectValue(exchangeStatusForApi),
    }),
    [filters, exchangeStatusForApi],
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
    const res = await listDepositsNormalized("exchange", params);
    if (!hasConsumedInitialListMetaRef.current) {
      hasConsumedInitialListMetaRef.current = true;
      const hint = res.meta.lastBankerDeposit;
      if (hint?.bankId && bankIdRef.current === "") {
        setBankId(hint.bankId);
        setBankAutocompleteDefault({ value: hint.bankId, label: hint.bankName });
      }
    }
    return res;
  }, []);

  const resetCreateForm = useCallback(() => {
    setSettlementAccountType("bank");
    setBankId("");
    setBankAutocompleteDefault(null);
    setLiabilityPersonId("");
    setPersonAutocompleteDefault(null);
    setUtr("");
    setMoney(defaultOperatedMoneyValue(platformCurrency));
    setEntryAt(currentDateTimeLocalValue());
    setCreatePlayerId("");
    setCreateErrors({});
  }, [platformCurrency]);

  const onCreateSubmit = useCallback(async () => {
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    const next: typeof createErrors = {};
    if (settlementAccountType === "bank" && !bankId.trim()) next.bankId = "Bank is required.";
    if (settlementAccountType === "person" && !liabilityPersonId.trim()) {
      next.liabilityPersonId = "Liability person is required.";
    }
    if (!utr.trim()) next.utr = "Reference number is required.";
    const amt = Number(money.amount);
    const minUnit = getCurrencyMinUnit(money.operatedCurrency || platformCurrency);
    if (!money.amount.trim() || Number.isNaN(amt) || amt < minUnit) {
      next.amount = `Amount must be at least ${minUnit}.`;
    } else if ((money.operatedCurrency || platformCurrency) !== platformCurrency) {
      const rate = Number(money.exchangeRate);
      if (!money.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
        next.amount = "Enter a valid exchange rate.";
      }
    }
    if (!createPlayerId.trim()) next.playerId = "Trader is required.";
    setCreateErrors(next);
    if (Object.keys(next).length > 0) return;

    const fx = toMoneyFxPayload(money, platformCurrency);
    const payload: DepositCreateInput =
      settlementAccountType === "bank"
        ? {
            settlementAccountType: "bank",
            bankId: bankId.trim(),
            utr: utr.trim(),
            amount: fx.amount,
            operatedCurrency: fx.operatedCurrency,
            operatedAmount: fx.operatedAmount,
            exchangeRate: fx.exchangeRate,
            entryAt,
            playerId: createPlayerId.trim(),
            bonusAmount: 0,
          }
        : {
            settlementAccountType: "person",
            liabilityPersonId: liabilityPersonId.trim(),
            utr: utr.trim(),
            amount: fx.amount,
            operatedCurrency: fx.operatedCurrency,
            operatedAmount: fx.operatedAmount,
            exchangeRate: fx.exchangeRate,
            entryAt,
            playerId: createPlayerId.trim(),
            bonusAmount: 0,
          };

    setCreateLoading(true);
    try {
      await createDeposit(payload);
      toast.success("Deposit recorded and verified.");
      setUtr("");
      setMoney(defaultOperatedMoneyValue(platformCurrency));
      setEntryAt(currentDateTimeLocalValue());
      setCreatePlayerId("");
      setCreateErrors({});
      // New rows are verified; ensure All so they appear, then refresh the table.
      if ((filters.status ?? "").trim().toLowerCase() !== "all") {
        setFilter("status", "all");
      }
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to record deposit"));
    } finally {
      setCreateLoading(false);
    }
  }, [
    platformCurrency,
    settlementAccountType,
    bankId,
    liabilityPersonId,
    utr,
    money,
    entryAt,
    createPlayerId,
    filters.status,
    setFilter,
  ]);

  const clearActionForm = useCallback(() => {
    setSelectedDeposit(null);
    setPlayerId("");
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
      status: depositStatusApiParam(exchangeStatusForApi),
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
  }, [handleExport, filters, sortBy, sortOrder, exchangeStatusForApi]);

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
      toast.error("Select a trader.");
      return;
    }
    setActionLoading(selectedDeposit.id);
    try {
      await exchangeActionApprove(selectedDeposit.id, playerId.trim(), 0);
      toast.success("Deposit settled and bank updated.");
      setTableKey((k) => k + 1);
      clearActionForm();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Approve failed."));
    } finally {
      setActionLoading(null);
    }
  }, [selectedDeposit, playerId, clearActionForm]);

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
    setPlayerId(r.playerMongoId?.trim() || "");
  }, []);

  const playerDefaultOption = useMemo((): AutocompleteOption | null => {
    if (!playerId.trim() || !selectedDeposit?.playerMongoId) return null;
    if (selectedDeposit.playerMongoId !== playerId.trim()) return null;
    const label = selectedDeposit.playerIdLabel?.trim();
    if (!label) return null;
    return { value: playerId.trim(), label };
  }, [playerId, selectedDeposit]);

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
        label: "Reference Number",
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
    [cachedUsers, loadCreatedByOptions, selectedId],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 pb-4">
      <div className="w-full shrink-0">
        <FormContainer
          className="!flex-none"
          title="Exchange deposit"
          description="Record settlement bank or liable person and trader in one step."
          contentOverflow="visible"
        >
          <div className="flex flex-col gap-4 px-5 py-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-[180px]">
                <FieldLabel className="mb-1 text-xs text-muted-foreground">Entry date & time *</FieldLabel>
                <Input
                  type="datetime-local"
                  className="h-9 text-sm"
                  value={entryAt}
                  onChange={(e) => setEntryAt(e.target.value)}
                />
              </div>
              <div className="w-[140px] space-y-1.5">
                <FieldLabel className="mb-1 text-xs text-muted-foreground">Settlement *</FieldLabel>
                <select
                  className="w-full h-9 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
                  value={settlementAccountType}
                  onChange={(e) => {
                    const v = e.target.value === "person" ? "person" : "bank";
                    setSettlementAccountType(v);
                    setCreateErrors((prev) => {
                      const n = { ...prev };
                      delete n.bankId;
                      delete n.liabilityPersonId;
                      return n;
                    });
                  }}
                  aria-label="Settlement account type"
                >
                  <option value="bank">Bank</option>
                  <option value="person">Liability person</option>
                </select>
              </div>
              {settlementAccountType === "bank" ? (
                <div className="min-w-[200px] flex-1">
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">Bank *</FieldLabel>
                  <AutocompleteField
                    value={bankId}
                    onChange={setBankId}
                    loadOptions={loadBankOptions}
                    placeholder="Search bank..."
                    emptyText="No banks found"
                    defaultOption={bankAutocompleteDefault}
                  />
                  <FieldError message={createErrors.bankId} />
                </div>
              ) : (
                <div className="min-w-[200px] flex-1">
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">Liability person *</FieldLabel>
                  <AutocompleteField
                    value={liabilityPersonId}
                    onChange={setLiabilityPersonId}
                    loadOptions={loadLiabilityPersonOptions}
                    placeholder="Search liability person..."
                    emptyText="No persons found"
                    defaultOption={personAutocompleteDefault}
                  />
                  <FieldError message={createErrors.liabilityPersonId} />
                </div>
              )}
              <div className="w-[160px]">
                <FieldLabel className="mb-1 text-xs text-muted-foreground">Reference Number *</FieldLabel>
                <Input
                  placeholder="Reference Number"
                  className="h-9 text-sm"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                />
                <FieldError message={createErrors.utr} />
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-[400px] max-w-[600px] flex-1">
                <OperatedMoneyFields
                  value={money}
                  onChange={setMoney}
                  amountLabel="Amount *"
                  roundMode="integer"
                  amountInputMode="numeric"
                  minAmount={1}
                  idPrefix="deposit-exchange-create"
                  compact
                />
                {createErrors.amount ? <FieldError message={createErrors.amount} /> : null}
              </div>
              <div className="min-w-[200px] flex-1">
                <FieldLabel className="mb-1 text-xs text-muted-foreground">Trader *</FieldLabel>
                <AutocompleteField
                  value={createPlayerId}
                  onChange={handleCreatePlayerIdChange}
                  loadOptions={loadPlayerOptions}
                  autoSelectSingleOption
                  placeholder="Search trader…"
                  emptyText="No traders found"
                />
                <FieldError message={createErrors.playerId} />
              </div>
            </div>
          </div>
          <FormActions>
            <Button
              type="button"
              variant="danger"
              startIcon={<IconX size={16} />}
              onClick={resetCreateForm}
              disabled={createLoading}
              className="h-9 px-4"
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="success"
              startIcon={<IconCheck size={16} />}
              onClick={() => void onCreateSubmit()}
              disabled={createLoading}
              className="h-9 px-4"
            >
              {createLoading ? "Saving…" : "Save"}
            </Button>
          </FormActions>
        </FormContainer>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
      <ListingPageContainer
        title="Deposit / Exchange depositor"
        description="Exchange deposit records. Use filters or export as needed."
        density="compact"
        fullWidth
        secondaryButtonLabel="Reset filters"
        onSecondaryClick={handleResetFilters}
        exportButtonLabel={exporting ? "Exporting…" : "Export"}
        onExportClick={onExportClick}
        exportDisabled={exporting}
        importButtonLabel="Import"
        onImportClick={() => setImportDialogOpen(true)}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Table */}
          <PaginatedTableReference
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            height="min(520px, calc(100vh - 420px))"
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
              status: depositStatusApiParam(exchangeStatusForApi),
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
            getRowKey={(row) => String((row as DepositRow).id)}
            selectedRowKey={selectedId}
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
      </div>

      {/* ─── Action sidebar ─────────────────────────────────────────────── */}
      <DetailsSidebar
        open={!!selectedDeposit}
        title="Exchange Action"
        subtitle={
          selectedDeposit
            ? `Reference Number: ${selectedDeposit.utr ?? "—"}`
            : undefined
        }
        onClose={closeSidebar}
        width="400px"
      >
        {selectedDeposit && (
          <div className="flex flex-col gap-4">
            {/* Deposit info card */}
            <DepositDetailCard deposit={selectedDeposit} />

            <div className="space-y-3">
              <div>
                <FieldLabel>
                  <span className="flex items-center gap-1.5">
                    <IconUser className="size-3.5" />
                    Trader *
                  </span>
                </FieldLabel>
                <AutocompleteField
                  value={playerId}
                  onChange={handlePlayerIdChange}
                  loadOptions={loadPlayerOptions}
                  defaultOption={playerDefaultOption}
                  autoSelectSingleOption
                  placeholder="Search trader…"
                  disabled={!canApproveOnSelection}
                />
                {!playerId && canApproveOnSelection && (
                  <p className="mt-1 text-xs text-amber-600">Trader is required to approve.</p>
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

      <DepositImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => setTableKey((k) => k + 1)}
      />
    </div>
  );
}
