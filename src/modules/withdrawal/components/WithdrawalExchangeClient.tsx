"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconCheck, IconX, IconPencil } from "@tabler/icons-react";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FormActions, FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FieldError } from "@/components/common/FieldError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  OperatedMoneyFields,
  defaultOperatedMoneyValue,
  toMoneyFxPayload,
} from "@/components/common/OperatedMoneyFields";
import { getCurrencyMinUnit, roundMoneyToCurrency } from "@/lib/currencies";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import {
  createWithdrawal,
  listSavedAccountsForPlayer,
  listWithdrawalsNormalized,
  updateWithdrawal,
  exportWithdrawals,
} from "@/services/withdrawalService";
import { useExport } from "@/hooks/useExport";
import { listPlayerLookupOptions } from "@/services/lookupService";
import { userService } from "@/services/userService";
import type { SavedWithdrawalAccount, WithdrawalRow } from "@/types/withdrawal";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/cn";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import {
  withdrawalStatusApiParam,
  withdrawalStatusColumnSelectValue,
} from "@/modules/withdrawal/withdrawalListingStatusFilter";
import { useApprovalQueueAutoRefresh } from "@/hooks/useApprovalQueueAutoRefresh";
import { currentDateTimeLocalValue, formatDateTimeForUser } from "@/lib/userTimezone";
import { WithdrawalImportDialog } from "./WithdrawalImportDialog";

const COLUMN_FILTER_KEYS = [
  "utr",
  "utr_op",
  "playerName",
  "playerName_op",
  "bankName",
  "bankName_op",
  "status",
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

function isLikelyMongoId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value.trim());
}

function resolveWithdrawalPlayerId(row: WithdrawalRow): string {
  const player = row.player;
  if (!player) return "";
  if (typeof player === "string") return player.trim();
  if (typeof player !== "object" || player === null) return "";
  const fromObjectId = (player as { _id?: unknown })._id;
  if (fromObjectId != null) return String(fromObjectId).trim();
  const fromId = (player as { id?: unknown }).id;
  if (fromId != null) return String(fromId).trim();
  return "";
}

type UserRow = {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
  name?: string;
};

function buildUserLabel(row: UserRow): string {
  const fullName = row.fullName?.trim();
  const username = row.username?.trim();
  const name = row.name?.trim();
  if (fullName && username) return `${fullName} (${username})`;
  if (fullName) return fullName;
  if (username) return username;
  return name || "";
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

export function WithdrawalExchangeClient() {
  const { formatWholeMoney } = useFormatMoney();
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    listingState;
  const { platformCurrency } = usePlatformSettings();

  const [playerId, setPlayerId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [money, setMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [reverseBonus, setReverseBonus] = useState("0");
  const [requestedAt, setRequestedAt] = useState(currentDateTimeLocalValue());
  const [savedPreset, setSavedPreset] = useState("");
  const [savedRows, setSavedRows] = useState<SavedWithdrawalAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [cachedUsers, setCachedUsers] = useState<Record<string, string>>({});

  useApprovalQueueAutoRefresh({
    module: "withdrawal",
    view: "exchange",
    onRefresh: () => setTableKey((k) => k + 1),
  });

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
      const options = rows
        .map((row) => {
          const value = String(row._id ?? row.id ?? "").trim();
          const label = buildUserLabel(row);
          if (!value || !label) return null;
          return { value, label };
        })
        .filter((row): row is AutocompleteOption => row !== null);
      setCachedUsers((prev) => {
        const next = { ...prev };
        for (const option of options) {
          next[option.value] = option.label;
        }
        return next;
      });
      return options;
    } catch {
      return [];
    }
  }, []);

  const loadPlayerOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const rows = await listPlayerLookupOptions({ q: query || undefined, limit: 25 });
      return rows.map((p) => ({
        value: String(p.id || "").trim(),
        label: `${p.playerId} · ${p.phone}`,
      }));
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!playerId) {
      setSavedRows([]);
      setSavedPreset("");
      return;
    }
    let cancelled = false;
    listSavedAccountsForPlayer(playerId)
      .then((rows) => {
        if (!cancelled) setSavedRows(rows);
      })
      .catch(() => {
        if (!cancelled) setSavedRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  useEffect(() => {
    if (!platformCurrency) return;
    setMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency, editingId]);

  const payablePreview = useMemo(() => {
    if (!platformCurrency) return 0;
    const a = Number(money.amount);
    const b = Number(reverseBonus);
    if (!money.amount.trim() || Number.isNaN(a) || a < 1) return 0;
    const fx = toMoneyFxPayload(money, platformCurrency);
    if (!Number.isFinite(fx.amount) || !Number.isFinite(fx.exchangeRate) || fx.exchangeRate <= 0) return 0;
    const rb = Number.isNaN(b) || b < 0 ? 0 : b;
    const rbPlatform = roundMoneyToCurrency(rb * fx.exchangeRate, platformCurrency);
    return Math.max(0, roundMoneyToCurrency(fx.amount - rbPlatform, platformCurrency));
  }, [money, reverseBonus, platformCurrency]);

  const onSubmit = async () => {
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    const next: Record<string, string | undefined> = {};
    if (!playerId.trim()) next.playerId = "Player is required.";
    if (!accountNumber.trim()) next.accountNumber = "Account number is required.";
    if (!accountHolderName.trim()) next.accountHolderName = "Account holder name is required.";
    if (!bankName.trim()) next.bankName = "Bank name is required.";
    if (!ifsc.trim()) next.ifsc = "IFSC is required.";
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
    const rb = Number(reverseBonus);
    if (reverseBonus.trim() !== "" && (Number.isNaN(rb) || rb < 0)) {
      next.reverseBonus = "Reverse bonus must be ≥ 0.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const fx = toMoneyFxPayload(money, platformCurrency);

    setLoading(true);
    try {
      if (editingId) {
        await updateWithdrawal(editingId, {
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim(),
          ifsc: ifsc.trim(),
          amount: fx.amount,
          operatedCurrency: fx.operatedCurrency,
          operatedAmount: fx.operatedAmount,
          exchangeRate: fx.exchangeRate,
          reverseBonus: Number.isNaN(rb) || rb < 0 ? 0 : rb,
        });
        toast.success("Withdrawal updated successfully.");
      } else {
        await createWithdrawal({
          playerId: playerId.trim(),
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim(),
          ifsc: ifsc.trim(),
          amount: fx.amount,
          operatedCurrency: fx.operatedCurrency,
          operatedAmount: fx.operatedAmount,
          exchangeRate: fx.exchangeRate,
          reverseBonus: Number.isNaN(rb) || rb < 0 ? 0 : rb,
          requestedAt,
        });
        toast.success("Withdrawal requested successfully.");
      }
      setEditingId(null);
      setAccountNumber("");
      setAccountHolderName("");
      setBankName("");
      setIfsc("");
      setMoney(defaultOperatedMoneyValue(platformCurrency));
      setReverseBonus("0");
      setRequestedAt(currentDateTimeLocalValue());
      setSavedPreset("");
      setErrors({});
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, editingId ? "Failed to update withdrawal" : "Failed to create withdrawal"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row: WithdrawalRow) => {
    setEditingId(row.id);
    setPlayerId(resolveWithdrawalPlayerId(row));
    setAccountNumber(row.accountNumber || "");
    setAccountHolderName(row.accountHolderName || "");
    setBankName(row.bankName || "");
    setIfsc(row.ifsc || "");
    setMoney({
      amount: String(row.operatedAmount ?? row.amount),
      operatedCurrency: row.operatedCurrency || platformCurrency || "",
      exchangeRate: String(row.exchangeRate ?? 1),
    });
    setReverseBonus(
      String(
        row.reverseBonus != null && row.exchangeRate && row.exchangeRate > 0
          ? Math.round(row.reverseBonus / row.exchangeRate)
          : row.reverseBonus || 0,
      ),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setPlayerId("");
    setAccountNumber("");
    setAccountHolderName("");
    setBankName("");
    setIfsc("");
    setMoney(defaultOperatedMoneyValue(platformCurrency));
    setReverseBonus("0");
    setRequestedAt(currentDateTimeLocalValue());
    setSavedPreset("");
    setEditingId(null);
    setErrors({});
  };

  const columnFilterValues = useMemo(
    () => ({
      ...filters,
      status: withdrawalStatusColumnSelectValue(filters.status),
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

  const { exporting, handleExport } = useExport((params) => exportWithdrawals(params), {
    fileName: `withdrawals-exchange-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      view: "exchange",
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
      status: withdrawalStatusApiParam(filters.status),
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

  const fetcher = useCallback(async (params: Record<string, unknown>) => {
    return listWithdrawalsNormalized("exchange", params);
  }, []);

  const creatorNameById = useMemo(() => new Map(Object.entries(cachedUsers)), [cachedUsers]);

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "playerName",
        label: "Player",
        render: (row: WithdrawalRow) => row.playerName,
        ...tableColumnPresets.nameCol,
        sortable: true,
        filterType: "text" as const,
        filterKey: "playerName",
        operatorKey: "playerName_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "account",
        label: "Account / Bank",
        minWidth: 200,
        sortable: false,
        render: (row: WithdrawalRow) => (
          <div className="text-sm">
            <div>{row.accountNumber || "—"}</div>
            <div className="text-xs text-gray-500">{row.bankName}</div>
          </div>
        ),
      },
      {
        field: "bankName",
        label: "Bank name",
        ...tableColumnPresets.nameCol,
        sortable: true,
        filterType: "text" as const,
        filterKey: "bankName",
        operatorKey: "bankName_op",
        defaultFilterOperator: "contains",
        render: (row: WithdrawalRow) => row.bankName,
      },
      {
        field: "amount",
        label: "Amount",
        render: (row: WithdrawalRow) => formatWholeMoney(row.amount),
        sortable: true,
        minWidth: 100,
        filterType: "number" as const,
        filterKey: "amount",
        filterKeyTo: "amount_to",
        operatorKey: "amount_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "payableAmount",
        label: "Payable",
        render: (row: WithdrawalRow) => (row.payableAmount != null ? formatWholeMoney(row.payableAmount) : "—"),
        sortable: true,
        minWidth: 100,
      },
      {
        field: "status",
        label: "Status",
        filterType: "select" as const,
        filterKey: "status",
        filterOptions: [
          { label: "Requested", value: "requested" },
          { label: "Approved", value: "approved" },
          { label: "Rejected", value: "rejected" },
        ],
        ...tableColumnPresets.statusCol,
        render: (row: WithdrawalRow) => <TableStatusBadge status={row.status} />,
      },
      {
        field: "createdBy",
        label: "Created By",
        render: (row: WithdrawalRow) => {
          if (row.createdByName) return row.createdByName;
          if (row.createdBy && creatorNameById.has(row.createdBy)) return creatorNameById.get(row.createdBy);
          if (row.createdBy && !isLikelyMongoId(row.createdBy)) return row.createdBy;
          return "—";
        },
        minWidth: 150,
        filterType: "autocomplete" as const,
        filterKey: "createdBy",
        filterLoadOptions: loadUserOptions,
        filterPlaceholder: "Search user",
      },
      {
        field: "approvedBy",
        label: "Approved By",
        render: (row: WithdrawalRow) => {
          if (row.approvedByName) return row.approvedByName;
          if (row.approvedBy && creatorNameById.has(row.approvedBy)) return creatorNameById.get(row.approvedBy);
          if (row.approvedBy && !isLikelyMongoId(row.approvedBy)) return row.approvedBy;
          return "—";
        },
        minWidth: 150,
        filterType: "autocomplete" as const,
        filterKey: "approvedBy",
        filterLoadOptions: loadUserOptions,
        filterPlaceholder: "Search user",
      },
      {
        field: "utr",
        label: "UTR",
        minWidth: 120,
        sortable: true,
        filterType: "text" as const,
        filterKey: "utr",
        operatorKey: "utr_op",
        defaultFilterOperator: "contains",
        render: (row: WithdrawalRow) => row.utr || "—",
      },
      {
        field: "due",
        label: "Due time",
        sortable: false,
        minWidth: 110,
        render: (row: WithdrawalRow) => formatRelative(row.requestedAt ?? row.createdAt),
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
        render: (row: WithdrawalRow) =>
          formatDateTimeForUser(row.requestedAt ?? row.createdAt),
      },
      {
        field: "actions",
        label: "Actions",
        isActionColumn: true,
        ...tableColumnPresets.actionsCol,
        render: (row: WithdrawalRow) => (
          <div className="flex gap-2">
            {row.status === "requested" ? (
              <Button size="icon" variant="secondary" onClick={() => handleEdit(row)} title="Edit withdrawal">
                <IconPencil size={18} />
              </Button>
            ) : (
              "—"
            )}
          </div>
        ),
      },
    ],
    [creatorNameById, loadUserOptions],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 pb-4">
      <div className="w-full shrink-0">
        <FormContainer
          className="!flex-none"
          title={editingId ? "Edit withdrawal" : "Exchange withdrawal"}
          description={
            editingId
              ? "Updating an existing withdrawal request."
              : "Create a withdrawal request for a player. Saved bank accounts from past withdrawals appear in the quick-select list."
          }
        >
          <FormGrid cols={4} compact>
            <div className="lg:col-span-1">
              <FieldLabel>Request date & time *</FieldLabel>
              <Input type="datetime-local" value={requestedAt} onChange={(e) => setRequestedAt(e.target.value)} />
            </div>
            <div
              className={cn(
                "md:col-span-2",
                playerId || editingId ? "lg:col-span-2" : "lg:col-span-3",
              )}
            >
              <FieldLabel>Player *</FieldLabel>
              <AutocompleteField
                value={playerId}
                onChange={(v) => {
                  setPlayerId(v);
                  setSavedPreset("");
                }}
                loadOptions={loadPlayerOptions}
              autoSelectSingleOption
                placeholder="Search player…"
                emptyText="No players found"
                disabled={!!editingId} // lock player on edit
              />
              <FieldError message={errors.playerId} />
            </div>
            {playerId || editingId ? (
              <div className="md:col-span-2 lg:col-span-1">
                <FieldLabel>Quick select account (optional)</FieldLabel>
                <Select
                  value={savedPreset}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSavedPreset(v);
                    if (v === "") return;
                    const idx = Number.parseInt(v, 10);
                    if (Number.isNaN(idx) || !savedRows[idx]) return;
                    const row = savedRows[idx];
                    setAccountNumber(row.accountNumber);
                    setAccountHolderName(row.accountHolderName);
                    setBankName(row.bankName);
                    setIfsc(row.ifsc);
                  }}
                  placeholder="Choose saved account or enter manually below…"
                  disabled={!!editingId}
                >
                  <option value="">Manual entry only</option>
                  {savedRows.map((r, i) => (
                    <option key={`${r.accountNumber}-${r.ifsc}-${i}`} value={String(i)}>
                      {r.accountNumber} · {r.bankName} ({r.ifsc})
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div>
              <FieldLabel>Account holder name *</FieldLabel>
              <Input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Holder name"
              />
              <FieldError message={errors.accountHolderName} />
            </div>
            <div>
              <FieldLabel>Account number *</FieldLabel>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account number"
              />
              <FieldError message={errors.accountNumber} />
            </div>
            <div>
              <FieldLabel>Bank name *</FieldLabel>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" />
              <FieldError message={errors.bankName} />
            </div>
            <div>
              <FieldLabel>IFSC *</FieldLabel>
              <Input value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="IFSC" />
              <FieldError message={errors.ifsc} />
            </div>
            <OperatedMoneyFields
              value={money}
              onChange={setMoney}
              amountLabel="Withdrawal amount *"
              roundMode="integer"
              amountInputMode="numeric"
              minAmount={1}
              idPrefix="withdrawal"
            />
            {errors.amount ? (
              <div className="col-span-full">
                <FieldError message={errors.amount} />
              </div>
            ) : null}
            <div>
              <FieldLabel>Reverse bonus</FieldLabel>
              <Input
                type="number"
                min={0}
                step="1"
                value={reverseBonus}
                onChange={(e) => setReverseBonus(e.target.value)}
                placeholder="0"
              />
              <FieldError message={errors.reverseBonus} />
            </div>
            <div>
              <FieldLabel>Payable amount</FieldLabel>
              <Input readOnly value={formatWholeMoney(payablePreview)} className="bg-slate-50" />
            </div>
          </FormGrid>
          <FormActions className="justify-between px-5 py-4">
            <Button
              type="button"
              variant="success"
              startIcon={<IconCheck size={18} />}
              onClick={onSubmit}
              disabled={loading}
            >
              {loading ? "Saving…" : editingId ? "Update" : "Save"}
            </Button>
            <Button type="button" variant="danger" startIcon={<IconX size={18} />} onClick={reset} disabled={loading}>
              {editingId ? "Cancel" : "Clear"}
            </Button>
          </FormActions>
        </FormContainer>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ListingPageContainer
          title="Exchange withdrawals"
          description="Requests in the exchange pipeline (requested, approved, rejected)."
          density="compact"
          fullWidth
          secondaryButtonLabel="Reset filters"
          onSecondaryClick={() => clearFilters({ keepQuickSearch: true })}
          exportButtonLabel="Export"
          onExportClick={onExportClick}
          exportDisabled={exporting}
          importButtonLabel="Import"
          onImportClick={() => setImportDialogOpen(true)}
        >
          <PaginatedTableReference
            reloadToken={tableKey}
            columns={columns}
            fetcher={fetcher}
            height="min(520px, calc(100vh - 380px))"
            showSearch={false}
            showPagination={false}
            onTotalChange={setTotalCount}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={{
              utr: toOptionalFilterValue(filters.utr || ""),
              utr_op: toOptionalFilterValue(filters.utr_op || ""),
              playerName: toOptionalFilterValue(filters.playerName || ""),
              playerName_op: toOptionalFilterValue(filters.playerName_op || ""),
              bankName: toOptionalFilterValue(filters.bankName || ""),
              bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
              status: withdrawalStatusApiParam(filters.status),
               amount: toOptionalFilterValue(filters.amount || ""),
              amount_to: toOptionalFilterValue(filters.amount_to || ""),
              amount_op: toOptionalFilterValue(filters.amount_op || ""),
              createdBy: toOptionalFilterValue(filters.createdBy || ""),
              approvedBy: toOptionalFilterValue(filters.approvedBy || ""),
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
        </ListingPageContainer>
      </div>

      <WithdrawalImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => setTableKey((k) => k + 1)}
      />
    </div>
  );
}
