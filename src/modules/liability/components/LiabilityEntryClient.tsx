"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import { FormContainer, FormActions } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import {
  OperatedMoneyFields,
  defaultOperatedMoneyValue,
  toMoneyFxPayload,
  type OperatedMoneyValue,
} from "@/components/common/OperatedMoneyFields";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { NAV_PERMISSIONS } from "@/lib/constants/navPermissions";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import {
  createLiabilityEntry,
  deleteLiabilityEntry,
  exportLiabilityEntries,
  listLiabilityEntriesNormalized,
  listLiabilityPersonsNormalized,
  updateLiabilityEntry,
} from "@/services/liabilityService";
import { useExport } from "@/hooks/useExport";
import { listBankLookupOptions } from "@/services/lookupService";
import { getApiErrorMessage } from "@/lib/apiError";
import { FxCurrencyRateCell, FxOperatedAmountCell } from "@/components/common/FxDisplayCells";
import type {
  LiabilityAccountType,
  LiabilityEntryRow,
  LiabilityEntryType,
} from "@/types/liability";
import { todayYmdInUserTz } from "@/lib/userTimezone";
import {
  LIABILITY_ENTRY_FILTER_KEYS,
  LiabilityEntryFilterPanel,
} from "@/modules/liability/components/LiabilityEntryFilterPanel";

type ManualAccountType = "bank" | "person";

function toOptionalFilterValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function isManualLiabilityEntry(row: LiabilityEntryRow): boolean {
  return (
    !row.sourceType &&
    !row.sourceExpenseId &&
    !row.sourceDepositId &&
    !row.sourceWithdrawalId &&
    !row.sourceReferralAccrualId
  );
}

function sourceLabel(row: LiabilityEntryRow): string {
  if (!isManualLiabilityEntry(row)) {
    const src = row.sourceType;
    if (src === "deposit") return "Deposit";
    if (src === "expense") return "Expense";
    if (src === "withdrawal") return "Withdrawal";
    if (src === "referral") return "Referral";
    return "System";
  }
  return "Manual";
}

function toManualAccountType(value: LiabilityAccountType): ManualAccountType {
  return value === "bank" ? "bank" : "person";
}

export function LiabilityEntryClient() {
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: [...LIABILITY_ENTRY_FILTER_KEYS],
  });
  const {
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
    q,
    setPage,
    setLimit,
    setSort,
    setQ,
    setFilters,
    clearFilters,
  } = listingState;
  const { platformCurrency } = usePlatformSettings();
  const { user } = useAuth();

  const canEdit = useMemo(() => {
    if (!user) return false;
    if (user.role === "superadmin") return true;
    return (user.permissions ?? []).includes(NAV_PERMISSIONS.LIABILITY_ENTRY_EDIT);
  }, [user]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    if (user.role === "superadmin") return true;
    return (user.permissions ?? []).includes(NAV_PERMISSIONS.LIABILITY_ENTRY_DELETE);
  }, [user]);

  const [entryDate, setEntryDate] = useState(() => todayYmdInUserTz());
  const [entryType, setEntryType] = useState<LiabilityEntryType>("journal");
  const [money, setMoney] = useState<OperatedMoneyValue>(() => defaultOperatedMoneyValue(platformCurrency));
  const [fromAccountType, setFromAccountType] = useState<ManualAccountType>("person");
  const [fromAccountId, setFromAccountId] = useState("");
  const [fromAccountDefault, setFromAccountDefault] = useState<AutocompleteOption | null>(null);
  const [toAccountType, setToAccountType] = useState<ManualAccountType>("bank");
  const [toAccountId, setToAccountId] = useState("");
  const [toAccountDefault, setToAccountDefault] = useState<AutocompleteOption | null>(null);
  const [referenceNo, setReferenceNo] = useState("");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSettlement, setEditingSettlement] = useState(false);
  const [settlementFromLabel, setSettlementFromLabel] = useState("");
  const [settlementToLabel, setSettlementToLabel] = useState("");
  const [settlementSourceLabel, setSettlementSourceLabel] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LiabilityEntryRow | null>(null);

  useEffect(() => {
    if (!platformCurrency) return;
    setMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency]);

  const loadPersonOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    const res = await listLiabilityPersonsNormalized({ page: 1, limit: 30, q: query, sortBy: "name", sortOrder: "asc" });
    return res.data.map((p) => ({ value: p.id, label: p.name }));
  }, []);

  const loadBankOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    const rows = await listBankLookupOptions({ q: query || undefined, limit: 30 });
    return rows.map((b) => ({
      value: b.id,
      label: b.label,
    }));
  }, []);

  const loadFromOptions = useCallback(
    async (query: string) => (fromAccountType === "person" ? loadPersonOptions(query) : loadBankOptions(query)),
    [fromAccountType, loadPersonOptions, loadBankOptions],
  );

  const loadToOptions = useCallback(
    async (query: string) => (toAccountType === "person" ? loadPersonOptions(query) : loadBankOptions(query)),
    [toAccountType, loadPersonOptions, loadBankOptions],
  );

  const fetcher = useCallback(async (params: Record<string, unknown>) => listLiabilityEntriesNormalized(params), []);

  const filterParams = useMemo(
    () => ({
      q: toOptionalFilterValue(q || ""),
      entryType: toOptionalFilterValue(filters.entryType || ""),
      sourceType: toOptionalFilterValue(filters.sourceType || ""),
      personId: toOptionalFilterValue(filters.personId || ""),
      bankId: toOptionalFilterValue(filters.bankId || ""),
      entryDate_from: toOptionalFilterValue(filters.entryDate_from || ""),
      entryDate_to: toOptionalFilterValue(filters.entryDate_to || ""),
      amount_from: toOptionalFilterValue(filters.amount_from || ""),
      amount_to: toOptionalFilterValue(filters.amount_to || ""),
      operatedCurrency: toOptionalFilterValue(filters.operatedCurrency || ""),
    }),
    [filters, q],
  );

  const { exporting, handleExport } = useExport((params) => exportLiabilityEntries(params), {
    fileName: `liability-entries-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
      ...filterParams,
    });
  }, [handleExport, filterParams, sortBy, sortOrder]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setEditingSettlement(false);
    setSettlementFromLabel("");
    setSettlementToLabel("");
    setSettlementSourceLabel("");
    setEntryDate(todayYmdInUserTz());
    setEntryType("journal");
    setMoney(defaultOperatedMoneyValue(platformCurrency));
    setFromAccountType("person");
    setFromAccountId("");
    setFromAccountDefault(null);
    setToAccountType("bank");
    setToAccountId("");
    setToAccountDefault(null);
    setReferenceNo("");
    setRemark("");
  }, [platformCurrency]);

  const hydrateEdit = useCallback(
    (row: LiabilityEntryRow) => {
      const settlement = !isManualLiabilityEntry(row);
      setEditingId(row.id);
      setEditingSettlement(settlement);
      setSettlementSourceLabel(settlement ? sourceLabel(row) : "");
      setSettlementFromLabel(row.fromAccountName || row.fromAccountId || "");
      setSettlementToLabel(row.toAccountName || row.toAccountId || "");
      setEntryDate(row.entryDate || todayYmdInUserTz());
      setEntryType(row.entryType);
      setMoney({
        amount: String(row.operatedAmount ?? row.amount ?? ""),
        operatedCurrency: row.operatedCurrency || platformCurrency || "",
        exchangeRate: String(row.exchangeRate ?? 1),
      });
      if (settlement) {
        setFromAccountId(row.fromAccountId);
        setToAccountId(row.toAccountId);
        setFromAccountDefault(null);
        setToAccountDefault(null);
      } else {
        const fromType = toManualAccountType(row.fromAccountType);
        const toType = toManualAccountType(row.toAccountType);
        setFromAccountType(fromType);
        setFromAccountId(row.fromAccountId);
        setFromAccountDefault(
          row.fromAccountId
            ? { value: row.fromAccountId, label: row.fromAccountName || row.fromAccountId }
            : null,
        );
        setToAccountType(toType);
        setToAccountId(row.toAccountId);
        setToAccountDefault(
          row.toAccountId ? { value: row.toAccountId, label: row.toAccountName || row.toAccountId } : null,
        );
      }
      setReferenceNo(row.referenceNo || "");
      setRemark(row.remark || "");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [platformCurrency],
  );

  const openDeleteDialog = useCallback((row: LiabilityEntryRow) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  }, []);

  const onSubmit = async () => {
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    const operatedAmt = Number(money.amount);
    if (!entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return toast.error("Valid entry date required.");
    if (!money.amount.trim() || Number.isNaN(operatedAmt) || operatedAmt <= 0) return toast.error("Valid amount required.");
    if (!editingSettlement && (!fromAccountId.trim() || !toAccountId.trim())) {
      return toast.error("Both accounts are required.");
    }
    if ((money.operatedCurrency || platformCurrency) !== platformCurrency) {
      const rate = Number(money.exchangeRate);
      if (!money.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
        return toast.error("Enter a valid exchange rate.");
      }
    }
    const fx = toMoneyFxPayload(money, platformCurrency, "decimal");
    setSaving(true);
    try {
      if (editingId && editingSettlement) {
        await updateLiabilityEntry(editingId, {
          entryDate,
          amount: fx.amount,
          operatedCurrency: fx.operatedCurrency,
          operatedAmount: fx.operatedAmount,
          exchangeRate: fx.exchangeRate,
          referenceNo: referenceNo.trim() || undefined,
          remark: remark.trim() || undefined,
        });
        toast.success("Settlement liability entry updated. Ledger will reflect this change.");
      } else if (editingId) {
        await updateLiabilityEntry(editingId, {
          entryDate,
          entryType,
          amount: fx.amount,
          operatedCurrency: fx.operatedCurrency,
          operatedAmount: fx.operatedAmount,
          exchangeRate: fx.exchangeRate,
          fromAccountType,
          fromAccountId: fromAccountId.trim(),
          toAccountType,
          toAccountId: toAccountId.trim(),
          referenceNo: referenceNo.trim() || undefined,
          remark: remark.trim() || undefined,
        });
        toast.success("Liability entry updated. Ledger and bank statement will reflect this change.");
      } else {
        await createLiabilityEntry({
          entryDate,
          entryType,
          amount: fx.amount,
          operatedCurrency: fx.operatedCurrency,
          operatedAmount: fx.operatedAmount,
          exchangeRate: fx.exchangeRate,
          fromAccountType,
          fromAccountId: fromAccountId.trim(),
          toAccountType,
          toAccountId: toAccountId.trim(),
          referenceNo: referenceNo.trim() || undefined,
          remark: remark.trim() || undefined,
        });
        toast.success("Liability entry posted.");
      }
      resetForm();
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, editingId ? "Failed to update liability entry" : "Failed to post liability entry"));
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteLiabilityEntry(deleteTarget.id);
      toast.success("Liability entry deleted. Ledger and bank statement will reflect this change.");
      if (editingId === deleteTarget.id) resetForm();
      setDeleteOpen(false);
      setDeleteTarget(null);
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete liability entry"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      { field: "entryDate", label: "Date", ...tableColumnPresets.dateCol, sortable: true },
      { field: "entryType", label: "Type", sortable: true },
      {
        field: "sourceType",
        label: "Source",
        render: (r: LiabilityEntryRow) => sourceLabel(r),
        minWidth: 100,
      },
      { field: "fromAccountName", label: "From", render: (r: LiabilityEntryRow) => r.fromAccountName || r.fromAccountId },
      { field: "toAccountName", label: "To", render: (r: LiabilityEntryRow) => r.toAccountName || r.toAccountId },
      { field: "amount", label: "Amount", render: (r: LiabilityEntryRow) => r.amount.toLocaleString(), sortable: true },
      {
        field: "operatedAmount",
        label: "Operated Amount",
        render: (r: LiabilityEntryRow) => (
          <FxOperatedAmountCell
            operatedAmount={r.operatedAmount}
            operatedCurrency={r.operatedCurrency}
          />
        ),
        sortable: false,
        minWidth: 120,
      },
      {
        field: "operatedCurrency",
        label: "Currency / Rate",
        render: (r: LiabilityEntryRow) => (
          <FxCurrencyRateCell
            operatedCurrency={r.operatedCurrency}
            exchangeRate={r.exchangeRate}
          />
        ),
        sortable: false,
        minWidth: 120,
      },
      { field: "referenceNo", label: "Reference", render: (r: LiabilityEntryRow) => r.referenceNo || "—" },
      { field: "remark", label: "Remark", render: (r: LiabilityEntryRow) => r.remark || "—" },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        minWidth: 120,
        render: (r: LiabilityEntryRow) => {
          if (!canEdit && !canDelete) {
            return <span className="text-xs text-slate-400">—</span>;
          }
          return (
            <div className="flex items-center gap-1">
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Edit liability entry"
                  startIcon={<IconPencil size={16} />}
                  onClick={() => hydrateEdit(r)}
                >
                  Edit
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Delete liability entry"
                  startIcon={<IconTrash size={16} />}
                  onClick={() => openDeleteDialog(r)}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canDelete, canEdit, hydrateEdit, openDeleteDialog],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <FormContainer
        title={
          editingId
            ? editingSettlement
              ? "Amend Settlement Liability Entry"
              : "Edit Liability Entry"
            : "Post Liability Entry"
        }
        description={
          editingId
            ? editingSettlement
              ? "Update date, amount, reference, or remark. Settlement account legs stay fixed so deposit/withdrawal directions remain correct."
              : "Update a manual transfer. Person ledger and bank statement recalculate from this entry."
            : "Transfer between bank/person accounts for receivable/payable movements."
        }
      >
        <FormGrid className="md:grid-cols-4">
          <div className="space-y-1.5">
            <FieldLabel>Date *</FieldLabel>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Entry Type *</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-600"
              value={entryType}
              disabled={editingSettlement}
              onChange={(e) => setEntryType(e.target.value as LiabilityEntryType)}
            >
              <option value="receipt">Receipt</option>
              <option value="payment">Payment</option>
              <option value="contra">Contra</option>
              <option value="journal">Journal</option>
            </select>
          </div>
          <OperatedMoneyFields
            value={money}
            onChange={setMoney}
            amountLabel="Amount *"
            roundMode="decimal"
            minAmount={0.01}
            idPrefix="liability-entry"
          />
          <div className="space-y-1.5">
            <FieldLabel>Reference No</FieldLabel>
            <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Reference" />
          </div>

          {editingSettlement ? (
            <>
              <div className="space-y-1.5">
                <FieldLabel>Source</FieldLabel>
                <Input value={settlementSourceLabel} readOnly disabled className="disabled:bg-slate-50" />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <FieldLabel>From (locked)</FieldLabel>
                <Input value={settlementFromLabel} readOnly disabled className="disabled:bg-slate-50" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <FieldLabel>To (locked)</FieldLabel>
                <Input value={settlementToLabel} readOnly disabled className="disabled:bg-slate-50" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <FieldLabel>From Type *</FieldLabel>
                <select
                  className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  value={fromAccountType}
                  onChange={(e) => {
                    setFromAccountType(e.target.value as ManualAccountType);
                    setFromAccountId("");
                    setFromAccountDefault(null);
                  }}
                >
                  <option value="person">Person</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>From Account *</FieldLabel>
                <AutocompleteField
                  value={fromAccountId}
                  onChange={setFromAccountId}
                  loadOptions={loadFromOptions}
                  defaultOption={fromAccountDefault}
                  placeholder={`Select ${fromAccountType}`}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>To Type *</FieldLabel>
                <select
                  className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  value={toAccountType}
                  onChange={(e) => {
                    setToAccountType(e.target.value as ManualAccountType);
                    setToAccountId("");
                    setToAccountDefault(null);
                  }}
                >
                  <option value="person">Person</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>To Account *</FieldLabel>
                <AutocompleteField
                  value={toAccountId}
                  onChange={setToAccountId}
                  loadOptions={loadToOptions}
                  defaultOption={toAccountDefault}
                  placeholder={`Select ${toAccountType}`}
                />
              </div>
            </>
          )}
          <div className="md:col-span-4 space-y-1.5">
            <FieldLabel>Remark</FieldLabel>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Optional remark" />
          </div>
        </FormGrid>
        <FormActions>
          {editingId ? (
            <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
              Cancel edit
            </Button>
          ) : null}
          <Button type="button" onClick={() => void onSubmit()} disabled={saving}>
            {saving ? (editingId ? "Saving..." : "Posting...") : editingId ? "Save changes" : "Post Entry"}
          </Button>
        </FormActions>
      </FormContainer>

      <ListingPageContainer
        title="Liability Entries"
        description="Manual bank/person transfers and settlement entries. Settlement legs are locked on amend; amount/date/remark can be changed. Delete clears the source link without cancelling the parent transaction."
        fullWidth
        secondaryButtonLabel="Reset filters"
        onSecondaryClick={() => clearFilters({ keepQuickSearch: true })}
        exportButtonLabel="Export"
        onExportClick={onExportClick}
        exportDisabled={exporting}
        filters={
          <LiabilityEntryFilterPanel
            q={q}
            filters={filters}
            setQ={setQ}
            setFilters={setFilters}
            onClear={() => clearFilters({ keepQuickSearch: false })}
          />
        }
      >
        <PaginatedTableReference
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          filterParams={filterParams}
          showSearch={false}
          showPagination={false}
          height="420px"
          onTotalChange={setTotalCount}
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
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </ListingPageContainer>

      <Dialog
        open={deleteOpen}
        title="Delete liability entry"
        onClose={() => !deleteLoading && setDeleteOpen(false)}
      >
        <p className="mb-3 text-sm text-gray-600">
          {deleteTarget && !isManualLiabilityEntry(deleteTarget)
            ? "This deletes the settlement liability entry and clears its link on the source deposit, withdrawal, expense, or referral. The parent transaction is not cancelled."
            : "This permanently deletes the manual entry. Person ledger and bank statement amounts will recalculate from remaining entries."}
        </p>
        <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-gray-700">
          {deleteTarget && !isManualLiabilityEntry(deleteTarget) ? (
            <div>
              <span className="font-medium">Source:</span> {sourceLabel(deleteTarget)}
            </div>
          ) : null}
          <div>
            <span className="font-medium">Date:</span> {deleteTarget?.entryDate || "—"}
          </div>
          <div>
            <span className="font-medium">Type:</span> {deleteTarget?.entryType || "—"}
          </div>
          <div>
            <span className="font-medium">From:</span>{" "}
            {deleteTarget?.fromAccountName || deleteTarget?.fromAccountId || "—"}
          </div>
          <div>
            <span className="font-medium">To:</span> {deleteTarget?.toAccountName || deleteTarget?.toAccountId || "—"}
          </div>
          <div>
            <span className="font-medium">Amount:</span>{" "}
            {deleteTarget?.amount != null ? deleteTarget.amount.toLocaleString() : "—"}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={() => void onConfirmDelete()} disabled={deleteLoading}>
            {deleteLoading ? "Deleting..." : "Delete entry"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
