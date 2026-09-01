"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconPlus, IconPencil, IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { FormContainer, FormActions } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  OperatedMoneyFields,
  defaultOperatedMoneyValue,
  toMoneyFxPayload,
} from "@/components/common/OperatedMoneyFields";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { createLiabilityPerson, exportLiabilityPersons, listLiabilityPersonsNormalized, updateLiabilityPerson } from "@/services/liabilityService";
import { useExport } from "@/hooks/useExport";
import { getApiErrorMessage } from "@/lib/apiError";
import type { LiabilityOpeningKind, LiabilityPersonRow } from "@/types/liability";
import {
  formatLiabilityMoneyAbs,
  liabilitySideAmountClass,
  liabilitySideBadgeClass,
} from "@/lib/liabilityDisplay";

const FILTER_KEYS = ["isActive"];

function toOptionalFilterValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function LiabilityPersonClient() {
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setSort, clearFilters } = listingState;
  const { platformCurrency } = usePlatformSettings();
  const fmtLiability = (value: number) => formatLiabilityMoneyAbs(value, platformCurrency);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [openingMoney, setOpeningMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [openingKind, setOpeningKind] = useState<LiabilityOpeningKind>("receivable");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!platformCurrency) return;
    setOpeningMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency, editingId]);

  const resetForm = useCallback(() => {
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setOpeningMoney(defaultOperatedMoneyValue(platformCurrency));
    setOpeningKind("receivable");
    setIsActive(true);
    setEditingId(null);
  }, [platformCurrency]);

  const fetcher = useCallback(async (params: Record<string, unknown>) => {
    return listLiabilityPersonsNormalized(params);
  }, []);

  const filterParams = useMemo(
    () => ({
      isActive: toOptionalFilterValue(filters.isActive || ""),
    }),
    [filters.isActive],
  );

  const { exporting, handleExport } = useExport((params) => exportLiabilityPersons(params), {
    fileName: `liability-persons-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
      ...filterParams,
    });
  }, [handleExport, filterParams, sortBy, sortOrder]);

  const onSubmit = async () => {
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const amtRaw = openingMoney.amount.trim();
    const amt = amtRaw ? Number(amtRaw) : 0;
    if (amtRaw && (Number.isNaN(amt) || amt < 0)) {
      toast.error("Opening amount must be a non-negative number.");
      return;
    }
    if (amt > 0 && (openingMoney.operatedCurrency || platformCurrency) !== platformCurrency) {
      const rate = Number(openingMoney.exchangeRate);
      if (!openingMoney.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
        toast.error("Enter a valid exchange rate.");
        return;
      }
    }
    const fx = toMoneyFxPayload(
      { ...openingMoney, amount: amtRaw === "" ? "0" : openingMoney.amount },
      platformCurrency,
      "decimal",
    );
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        openingAmount: fx.amount,
        openingOperatedCurrency: fx.operatedCurrency,
        openingOperatedAmount: fx.operatedAmount,
        openingExchangeRate: fx.exchangeRate,
        ...(fx.amount > 0 ? { openingKind } : {}),
        isActive,
      };
      if (editingId) {
        await updateLiabilityPerson(editingId, payload);
        toast.success("Liability person updated.");
      } else {
        await createLiabilityPerson(payload);
        toast.success("Liability person created.");
      }
      resetForm();
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to save liability person"));
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      { field: "name", label: "Name", ...tableColumnPresets.nameCol },
      { field: "phone", label: "Phone", render: (r: LiabilityPersonRow) => r.phone || "—" },
      { field: "email", label: "Email", render: (r: LiabilityPersonRow) => r.email || "—" },
      {
        field: "openingBalance",
        label: "Opening",
        render: (r: LiabilityPersonRow) => (
          <div className="flex flex-col items-end gap-0.5">
            <span className={liabilitySideAmountClass(r.openingBalanceSide)}>
              {fmtLiability(r.openingBalanceAbs)}
            </span>
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${liabilitySideBadgeClass(r.openingBalanceSide)}`}
            >
              {r.openingBalanceSide}
            </span>
          </div>
        ),
      },
      {
        field: "totalDebits",
        label: "Total Debits",
        render: (r: LiabilityPersonRow) => r.totalDebits.toLocaleString(),
      },
      {
        field: "totalCredits",
        label: "Total Credits",
        render: (r: LiabilityPersonRow) => r.totalCredits.toLocaleString(),
      },
      {
        field: "closingBalance",
        label: "Closing (platform)",
        render: (r: LiabilityPersonRow) => (
          <div className="flex flex-col items-end gap-0.5">
            <span className={liabilitySideAmountClass(r.closingBalanceSide)}>
              {fmtLiability(r.closingBalanceAbs)}
            </span>
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${liabilitySideBadgeClass(r.closingBalanceSide)}`}
            >
              {r.closingBalanceSide}
            </span>
          </div>
        ),
      },
      {
        field: "status",
        label: "Status",
        ...tableColumnPresets.statusCol,
        render: (r: LiabilityPersonRow) => (
          <TableStatusBadge status={r.isActive ? "active" : "deactive"} />
        ),
      },
      {
        field: "actions",
        label: "Actions",
        isActionColumn: true,
        ...tableColumnPresets.actionsCol,
        render: (r: LiabilityPersonRow) => (
          <Button
            size="sm"
            variant="secondary"
            startIcon={<IconPencil size={14} />}
            onClick={() => {
              setEditingId(r.id);
              setName(r.name);
              setPhone(r.phone || "");
              setEmail(r.email || "");
              setNotes(r.notes || "");
              setOpeningMoney({
                amount: String(r.openingOperatedAmount ?? r.openingBalanceAbs ?? 0),
                operatedCurrency: r.openingOperatedCurrency || platformCurrency || "",
                exchangeRate: String(r.openingExchangeRate ?? 1),
              });
              setOpeningKind(
                r.openingBalanceSide === "payable"
                  ? "payable"
                  : "receivable",
              );
              setIsActive(r.isActive);
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    [platformCurrency],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <FormContainer
        title={editingId ? "Update Liability Person" : "Add Liability Person"}
        description="Create non-login debtor/creditor account records for payable/receivable tracking."
      >
        <FormGrid className="md:grid-cols-3">
          <div className="space-y-1.5">
            <FieldLabel>Name *</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Person name" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Phone</FieldLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Email</FieldLabel>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          </div>
          <OperatedMoneyFields
            value={openingMoney}
            onChange={setOpeningMoney}
            amountLabel="Opening amount"
            roundMode="decimal"
            minAmount={0}
            idPrefix="liability-person-opening"
          />
          <div className="space-y-1.5">
            <FieldLabel>Opening type</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={openingKind}
              onChange={(e) => setOpeningKind(e.target.value as LiabilityOpeningKind)}
              disabled={!openingMoney.amount.trim() || Number(openingMoney.amount) === 0}
            >
              <option value="receivable">Receivable (we are owed)</option>
              <option value="payable">Payable (we owe)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Status</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={isActive ? "active" : "deactive"}
              onChange={(e) => setIsActive(e.target.value === "active")}
            >
              <option value="active">Active</option>
              <option value="deactive">Deactive</option>
            </select>
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <FieldLabel>Notes</FieldLabel>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </FormGrid>
        <FormActions className="justify-between">
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={loading}
            startIcon={editingId ? <IconDeviceFloppy size={16} /> : <IconPlus size={16} />}
          >
            {loading ? "Saving..." : editingId ? "Update Person" : "Add Person"}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={resetForm} startIcon={<IconX size={16} />}>
              Cancel Edit
            </Button>
          )}
        </FormActions>
      </FormContainer>

      <ListingPageContainer
        title="Liability Persons"
        description="Debtor/Creditor master records. Closing balance uses platform perspective (same as Liability Ledger → Platform)."
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
