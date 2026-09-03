"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import { FormContainer, FormActions } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import {
  OperatedMoneyFields,
  defaultOperatedMoneyValue,
  toMoneyFxPayload,
} from "@/components/common/OperatedMoneyFields";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { createLiabilityEntry, exportLiabilityEntries, listLiabilityEntriesNormalized, listLiabilityPersonsNormalized } from "@/services/liabilityService";
import { useExport } from "@/hooks/useExport";
import { listBankLookupOptions } from "@/services/lookupService";
import { getApiErrorMessage } from "@/lib/apiError";
import { FxCurrencyRateCell, FxOperatedAmountCell } from "@/components/common/FxDisplayCells";
import type { LiabilityAccountType, LiabilityEntryRow, LiabilityEntryType } from "@/types/liability";
import { todayYmdInUserTz } from "@/lib/userTimezone";

const FILTER_KEYS = ["entryType", "accountType", "accountId", "entryDate_from", "entryDate_to"];


function toOptionalFilterValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function LiabilityEntryClient() {
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setSort, clearFilters } = listingState;
  const { platformCurrency } = usePlatformSettings();

  const [entryDate, setEntryDate] = useState(() => todayYmdInUserTz());
  const [entryType, setEntryType] = useState<LiabilityEntryType>("journal");
  const [money, setMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [fromAccountType, setFromAccountType] = useState<LiabilityAccountType>("person");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountType, setToAccountType] = useState<LiabilityAccountType>("bank");
  const [toAccountId, setToAccountId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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
      entryType: toOptionalFilterValue(filters.entryType || ""),
      accountType: toOptionalFilterValue(filters.accountType || ""),
      accountId: toOptionalFilterValue(filters.accountId || ""),
      entryDate_from: toOptionalFilterValue(filters.entryDate_from || ""),
      entryDate_to: toOptionalFilterValue(filters.entryDate_to || ""),
    }),
    [filters],
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
    setEntryDate(todayYmdInUserTz());
    setEntryType("journal");
    setMoney(defaultOperatedMoneyValue(platformCurrency));
    setFromAccountType("person");
    setFromAccountId("");
    setToAccountType("bank");
    setToAccountId("");
    setReferenceNo("");
    setRemark("");
  }, [platformCurrency]);

  const onSubmit = async () => {
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    const operatedAmt = Number(money.amount);
    if (!entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return toast.error("Valid entry date required.");
    if (!fromAccountId.trim() || !toAccountId.trim()) return toast.error("Both accounts are required.");
    if (!money.amount.trim() || Number.isNaN(operatedAmt) || operatedAmt <= 0) return toast.error("Valid amount required.");
    if ((money.operatedCurrency || platformCurrency) !== platformCurrency) {
      const rate = Number(money.exchangeRate);
      if (!money.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
        return toast.error("Enter a valid exchange rate.");
      }
    }
    const fx = toMoneyFxPayload(money, platformCurrency, "decimal");
    setSaving(true);
    try {
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
      resetForm();
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to post liability entry"));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      { field: "entryDate", label: "Date", ...tableColumnPresets.dateCol, sortable: true },
      { field: "entryType", label: "Type", sortable: true },
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
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <FormContainer title="Post Liability Entry" description="Transfer between bank/person accounts for receivable/payable movements.">
        <FormGrid className="md:grid-cols-4">
          <div className="space-y-1.5">
            <FieldLabel>Date *</FieldLabel>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Entry Type *</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={entryType}
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

          <div className="space-y-1.5">
            <FieldLabel>From Type *</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={fromAccountType}
              onChange={(e) => {
                setFromAccountType(e.target.value as LiabilityAccountType);
                setFromAccountId("");
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
              placeholder={`Select ${fromAccountType}`}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>To Type *</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={toAccountType}
              onChange={(e) => {
                setToAccountType(e.target.value as LiabilityAccountType);
                setToAccountId("");
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
              placeholder={`Select ${toAccountType}`}
            />
          </div>
          <div className="md:col-span-4 space-y-1.5">
            <FieldLabel>Remark</FieldLabel>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Optional remark" />
          </div>
        </FormGrid>
        <FormActions>
          <Button type="button" onClick={() => void onSubmit()} disabled={saving}>
            {saving ? "Posting..." : "Post Entry"}
          </Button>
        </FormActions>
      </FormContainer>

      <ListingPageContainer
        title="Liability Entries"
        description="Posted transfer entries between bank and person accounts."
        fullWidth
        secondaryButtonLabel="Reset filters"
        onSecondaryClick={() => clearFilters({ keepQuickSearch: true })}
        exportButtonLabel="Export"
        onExportClick={onExportClick}
        exportDisabled={exporting}
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
    </div>
  );
}
