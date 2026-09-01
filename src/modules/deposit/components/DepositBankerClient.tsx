"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FormActions, FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FieldError } from "@/components/common/FieldError";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  OperatedMoneyFields,
  defaultOperatedMoneyValue,
  toMoneyFxPayload,
} from "@/components/common/OperatedMoneyFields";
import { getCurrencyMinUnit } from "@/lib/currencies";
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
  exportDeposits,
  listDepositsNormalized,
  updateDeposit,
} from "@/services/depositService";
import { useExport } from "@/hooks/useExport";
import {
  depositStatusApiParam,
  depositStatusColumnSelectValue,
} from "@/modules/deposit/depositListingStatusFilter";
import { listBankLookupOptions } from "@/services/lookupService";
import { listLiabilityPersonsNormalized } from "@/services/liabilityService";
import type { DepositRow, DepositUpdateInput } from "@/types/deposit";
import { getApiErrorMessage } from "@/lib/apiError";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { useApprovalQueueAutoRefresh } from "@/hooks/useApprovalQueueAutoRefresh";
import { DepositImportDialog } from "./DepositImportDialog";
import { currentDateTimeLocalValue, formatDateTimeForUser } from "@/lib/userTimezone";
import { filterDepositBanks } from "@/modules/withdrawal/withdrawalPayoutBankMethodFilter";

const COLUMN_FILTER_KEYS = [
  "utr",
  "utr_op",
  "bankName",
  "bankName_op",
  "status",
  "amount",
  "amount_to",
  "amount_op",
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


export function DepositBankerClient() {
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    listingState;
  const { platformCurrency } = usePlatformSettings();
  const { formatWholeMoney } = useFormatMoney();

  const [settlementAccountType, setSettlementAccountType] = useState<"bank" | "person">("bank");
  const [bankId, setBankId] = useState("");
  const [bankAutocompleteDefault, setBankAutocompleteDefault] = useState<AutocompleteOption | null>(null);
  const [liabilityPersonId, setLiabilityPersonId] = useState("");
  const [personAutocompleteDefault, setPersonAutocompleteDefault] = useState<AutocompleteOption | null>(null);
  const bankIdRef = useRef(bankId);
  const hasConsumedInitialListMetaRef = useRef(false);

  useEffect(() => {
    bankIdRef.current = bankId;
  }, [bankId]);
  const [utr, setUtr] = useState("");
  const [money, setMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [entryAt, setEntryAt] = useState(currentDateTimeLocalValue());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    bankId?: string;
    liabilityPersonId?: string;
    utr?: string;
    amount?: string;
  }>({});
  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [editDeposit, setEditDeposit] = useState<DepositRow | null>(null);
  const [editBankId, setEditBankId] = useState("");
  const [editUtr, setEditUtr] = useState("");
  const [editMoney, setEditMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [editLoading, setEditLoading] = useState(false);
  const [editSettlementAccountType, setEditSettlementAccountType] = useState<"bank" | "person">("bank");
  const [editLiabilityPersonId, setEditLiabilityPersonId] = useState("");
  const [editPersonAutocompleteDefault, setEditPersonAutocompleteDefault] = useState<AutocompleteOption | null>(null);
  const [editErrors, setEditErrors] = useState<{
    bankId?: string;
    liabilityPersonId?: string;
    utr?: string;
    amount?: string;
  }>({});

  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    if (!platformCurrency) return;
    setMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency]);

  useEffect(() => {
    if (!platformCurrency) return;
    setEditMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency, editDeposit]);

  useApprovalQueueAutoRefresh({
    module: "deposit",
    view: "banker",
    onRefresh: () => setTableKey((k) => k + 1),
  });

  const loadBankOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const rows = filterDepositBanks(await listBankLookupOptions({ q: query || undefined, limit: 25 }));
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

  const onSubmit = async () => {
    toast.info("Deposits are recorded on Deposit → Exchange.");
  };

  const reset = () => {
    setSettlementAccountType("bank");
    setBankId("");
    setBankAutocompleteDefault(null);
    setLiabilityPersonId("");
    setPersonAutocompleteDefault(null);
    setUtr("");
    setMoney(defaultOperatedMoneyValue(platformCurrency));
    setEntryAt(currentDateTimeLocalValue());
    setErrors({});
  };

  const closeEdit = () => {
    setEditDeposit(null);
    setEditSettlementAccountType("bank");
    setEditBankId("");
    setEditLiabilityPersonId("");
    setEditPersonAutocompleteDefault(null);
    setEditUtr("");
    setEditMoney(defaultOperatedMoneyValue(platformCurrency));
    setEditErrors({});
  };

  const onEditSubmit = async () => {
    if (!editDeposit) return;
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    const next: typeof editErrors = {};
    if (editSettlementAccountType === "bank" && !editBankId.trim()) next.bankId = "Bank is required.";
    if (editSettlementAccountType === "person" && !editLiabilityPersonId.trim()) {
      next.liabilityPersonId = "Liability person is required.";
    }
    if (!editUtr.trim()) next.utr = "Reference number is required.";
    const amt = Number(editMoney.amount);
    const minUnit = getCurrencyMinUnit(editMoney.operatedCurrency || platformCurrency);
    if (!editMoney.amount.trim() || Number.isNaN(amt) || amt < minUnit) {
      next.amount = `Amount must be at least ${minUnit}.`;
    } else if ((editMoney.operatedCurrency || platformCurrency) !== platformCurrency) {
      const rate = Number(editMoney.exchangeRate);
      if (!editMoney.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
        next.amount = "Enter a valid exchange rate.";
      }
    }
    setEditErrors(next);
    if (Object.keys(next).length > 0) return;

    const fx = toMoneyFxPayload(editMoney, platformCurrency);

    const editPayload: DepositUpdateInput =
      editSettlementAccountType === "bank"
        ? {
            settlementAccountType: "bank",
            bankId: editBankId.trim(),
            utr: editUtr.trim(),
            amount: fx.amount,
            operatedCurrency: fx.operatedCurrency,
            operatedAmount: fx.operatedAmount,
            exchangeRate: fx.exchangeRate,
          }
        : {
            settlementAccountType: "person",
            liabilityPersonId: editLiabilityPersonId.trim(),
            utr: editUtr.trim(),
            amount: fx.amount,
            operatedCurrency: fx.operatedCurrency,
            operatedAmount: fx.operatedAmount,
            exchangeRate: fx.exchangeRate,
          };

    setEditLoading(true);
    try {
      await updateDeposit(editDeposit.id, editPayload);
      toast.success("Deposit updated.");
      closeEdit();
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update deposit"));
    } finally {
      setEditLoading(false);
    }
  };

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

  const { exporting, handleExport } = useExport((params) => exportDeposits("banker", params), {
    fileName: `deposits-banker-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
      utr: toOptionalFilterValue(filters.utr || ""),
      utr_op: toOptionalFilterValue(filters.utr_op || ""),
      bankName: toOptionalFilterValue(filters.bankName || ""),
      bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
      status: depositStatusApiParam(filters.status),
      amount: toOptionalFilterValue(filters.amount || ""),
      amount_to: toOptionalFilterValue(filters.amount_to || ""),
      amount_op: toOptionalFilterValue(filters.amount_op || ""),
      createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
      createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
      createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
    });
  }, [handleExport, filters, sortBy, sortOrder]);

  const fetcher = useCallback(async (params: Record<string, unknown>) => {
    const res = await listDepositsNormalized("banker", params);
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

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "utr",
        label: "Reference Number",
        render: (row: DepositRow) => row.utr,
        minWidth: 140,
        sortable: true,
        filterType: "text" as const,
        filterKey: "utr",
        operatorKey: "utr_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "bankName",
        label: "Bank / Liable person",
        render: (row: DepositRow) =>
          row.settlementAccountType === "person"
            ? row.liabilityPersonName?.trim()
              ? `LP: ${row.liabilityPersonName.trim()}`
              : "—"
            : row.bankName || "—",
        ...tableColumnPresets.nameCol,
        sortable: true,
        filterType: "text" as const,
        filterKey: "bankName",
        operatorKey: "bankName_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "amount",
        label: "Amount",
        render: (row: DepositRow) => formatWholeMoney(row.amount),
        sortable: true,
        minWidth: 110,
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
        minWidth: 120,
        render: (row: DepositRow) => formatRelative(row.entryAt ?? row.createdAt),
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
        label: "Actions",
        isActionColumn: true,
        ...tableColumnPresets.actionsCol,
        sortable: false,
        render: (row: DepositRow) =>
          row.status === "pending" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              startIcon={<IconPencil size={16} />}
              onClick={() => {
                setEditDeposit(row);
                const mode = row.settlementAccountType === "person" ? "person" : "bank";
                setEditSettlementAccountType(mode);
                setEditBankId(row.bankId ?? "");
                setEditLiabilityPersonId(row.liabilityPersonId ?? "");
                setEditPersonAutocompleteDefault(
                  row.liabilityPersonId && row.liabilityPersonName
                    ? { value: row.liabilityPersonId, label: row.liabilityPersonName }
                    : null,
                );
                setEditUtr(row.utr);
                setEditMoney({
                  amount: String(row.operatedAmount ?? row.amount),
                  operatedCurrency: row.operatedCurrency || platformCurrency || "",
                  exchangeRate: String(row.exchangeRate ?? 1),
                });
                setEditErrors({});
              }}
            >
              Edit
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [platformCurrency],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 pb-4">
      {/* FormContainer defaults to flex-1; without shrink-0 the table steals height and the add form can disappear above the fold. */}
      <div className="w-full shrink-0">
        <FormContainer
          className="!flex-none"
          title="Banker deposit"
          description="Default settlement is bank. Rare cases may settle through a liable person instead; exchange approval posts the liability ledger entry when person is chosen."
          contentOverflow="visible"
        >
        <div className="flex flex-wrap items-start gap-4 px-5 py-4">
          <div className="w-[180px]">
            <FieldLabel className="mb-1 text-xs text-muted-foreground">Entry date & time *</FieldLabel>
            <Input type="datetime-local" className="h-9 text-sm" value={entryAt} onChange={(e) => setEntryAt(e.target.value)} />
          </div>
          <div className="w-[140px] space-y-1.5">
            <FieldLabel className="mb-1 text-xs text-muted-foreground">Settlement *</FieldLabel>
            <select
              className="w-full h-9 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
              value={settlementAccountType}
              onChange={(e) => {
                const v = e.target.value === "person" ? "person" : "bank";
                setSettlementAccountType(v);
                setErrors((prev) => {
                  const n = { ...prev };
                  delete n.bankId;
                  delete n.liabilityPersonId;
                  return n;
                });
              }}
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
              <FieldError message={errors.bankId} />
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
              <FieldError message={errors.liabilityPersonId} />
            </div>
          )}
          <div className="w-[160px]">
            <FieldLabel className="mb-1 text-xs text-muted-foreground">Reference Number *</FieldLabel>
            <Input placeholder="Reference Number" className="h-9 text-sm" value={utr} onChange={(e) => setUtr(e.target.value)} />
            <FieldError message={errors.utr} />
          </div>
          <div className="min-w-[320px] flex-1">
            <OperatedMoneyFields
              value={money}
              onChange={setMoney}
              amountLabel="Amount *"
              roundMode="integer"
              amountInputMode="numeric"
              minAmount={1}
              idPrefix="deposit-create"
              compact
            />
            {errors.amount ? <FieldError message={errors.amount} /> : null}
          </div>
        </div>
        <FormActions>
          <Button
            type="button"
            variant="danger"
            startIcon={<IconX size={16} />}
            onClick={reset}
            disabled={loading}
            className="h-9 px-4"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="success"
            startIcon={<IconCheck size={16} />}
            onClick={onSubmit}
            disabled={loading}
            className="h-9 px-4"
          >
            {loading ? "Saving…" : "Save"}
          </Button>
        </FormActions>
        </FormContainer>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
      <ListingPageContainer
        title="Deposits awaiting exchange"
        description="Entries pending exchange action (same queue as Exchange Depositors)."
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
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          height="min(520px, calc(100vh - 320px))"
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
            status: depositStatusApiParam(filters.status),
            amount: toOptionalFilterValue(filters.amount || ""),
            amount_to: toOptionalFilterValue(filters.amount_to || ""),
            amount_op: toOptionalFilterValue(filters.amount_op || ""),
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

      {editDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="card w-full max-w-lg space-y-4 p-5">
            <h3 className="text-lg font-semibold">Edit pending deposit</h3>
            <p className="text-sm text-muted-foreground">
              Settlement mode, counterparty, Reference Number, and amount can be corrected while the deposit is pending.
            </p>
            <div className="flex flex-wrap items-start gap-4 pt-2">
              <div className="w-[140px] space-y-1">
                <FieldLabel className="mb-1 text-xs text-muted-foreground">Settlement *</FieldLabel>
                <select
                  className="w-full max-w-xs rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  value={editSettlementAccountType}
                  onChange={(e) => {
                    const v = e.target.value === "person" ? "person" : "bank";
                    setEditSettlementAccountType(v);
                    setEditErrors((prev) => {
                      const n = { ...prev };
                      delete n.bankId;
                      delete n.liabilityPersonId;
                      return n;
                    });
                  }}
                  disabled={editLoading}
                >
                  <option value="bank">Bank</option>
                  <option value="person">Liability person</option>
                </select>
              </div>
              {editSettlementAccountType === "bank" ? (
                <div className="min-w-[200px] flex-1">
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">Bank *</FieldLabel>
                  <AutocompleteField
                    value={editBankId}
                    onChange={setEditBankId}
                    loadOptions={loadBankOptions}
                    placeholder="Search bank..."
                    emptyText="No banks found"
                    defaultOption={
                      editDeposit && editBankId
                        ? { value: editBankId, label: editDeposit.bankName.trim() || "—" }
                        : null
                    }
                    disabled={editLoading}
                  />
                  <FieldError message={editErrors.bankId} />
                </div>
              ) : (
                <div className="min-w-[200px] flex-1">
                  <FieldLabel className="mb-1 text-xs text-muted-foreground">Liability person *</FieldLabel>
                  <AutocompleteField
                    value={editLiabilityPersonId}
                    onChange={setEditLiabilityPersonId}
                    loadOptions={loadLiabilityPersonOptions}
                    placeholder="Search liability person..."
                    emptyText="No persons found"
                    defaultOption={editPersonAutocompleteDefault}
                    disabled={editLoading}
                  />
                  <FieldError message={editErrors.liabilityPersonId} />
                </div>
              )}
              <div className="w-[160px]">
                <FieldLabel className="mb-1 text-xs text-muted-foreground">Reference Number *</FieldLabel>
                <Input placeholder="Reference Number" className="h-9 text-sm" value={editUtr} onChange={(e) => setEditUtr(e.target.value)} />
                <FieldError message={editErrors.utr} />
              </div>
              <div className="min-w-[320px] flex-1">
                <OperatedMoneyFields
                  value={editMoney}
                  onChange={setEditMoney}
                  amountLabel="Amount *"
                  roundMode="integer"
                  amountInputMode="numeric"
                  minAmount={1}
                  idPrefix="deposit-edit"
                  disabled={editLoading}
                  compact
                />
                {editErrors.amount ? <FieldError message={editErrors.amount} /> : null}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] mt-4">
              <Button type="button" variant="secondary" onClick={closeEdit} disabled={editLoading}>
                Cancel
              </Button>
              <Button type="button" variant="success" onClick={onEditSubmit} disabled={editLoading}>
                {editLoading ? "Updating…" : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DepositImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => setTableKey((k) => k + 1)}
      />
    </div>
  );
}
