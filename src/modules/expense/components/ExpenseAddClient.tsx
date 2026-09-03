"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { IconDeviceFloppy, IconPencil, IconX, IconPlus } from "@tabler/icons-react";
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
  createExpense,
  listExpensesNormalized,
  updateExpense,
  uploadExpenseDocuments,
} from "@/services/expenseService";
import { listBankLookupOptions, listExpenseTypeLookupOptions } from "@/services/lookupService";
import { listLiabilityPersonsNormalized } from "@/services/liabilityService";
import { userService } from "@/services/userService";
import { getApiErrorMessage } from "@/lib/apiError";
import type { ExpenseRow } from "@/types/expense";
import { todayYmdInUserTz } from "@/lib/userTimezone";

const COLUMN_FILTER_KEYS = [
  "expenseTypeId",
  "bankId",
  "status",
  "amount",
  "amount_to",
  "amount_op",
  "createdBy",
  "expenseDate_from",
  "expenseDate_to",
  "expenseDate_op",
];

function toOptionalFilterValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
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

type ExpenseTypeMetaStatus = "idle" | "loading" | "ready";

export function ExpenseAddClient() {
  const listingState = useListingQueryStateReference({
    defaultLimit: 10,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    listingState;
  const { platformCurrency } = usePlatformSettings();

  const expenseListFetcher = useCallback(async (params: Record<string, unknown>) => {
    return listExpensesNormalized(params);
  }, []);

  const expenseTableColumnFilterValues = useMemo(() => ({ ...filters }), [filters]);

  const expenseTableFilterParams = useMemo(
    () => ({
      expenseTypeId: toOptionalFilterValue(filters.expenseTypeId || ""),
      bankId: toOptionalFilterValue(filters.bankId || ""),
      status: toOptionalFilterValue(filters.status || ""),
      amount: toOptionalFilterValue(filters.amount || ""),
      amount_to: toOptionalFilterValue(filters.amount_to || ""),
      amount_op: toOptionalFilterValue(filters.amount_op || ""),
      createdBy: toOptionalFilterValue(filters.createdBy || ""),
      expenseDate_from: toOptionalFilterValue(filters.expenseDate_from || ""),
      expenseDate_to: toOptionalFilterValue(filters.expenseDate_to || ""),
      expenseDate_op: toOptionalFilterValue(filters.expenseDate_op || ""),
    }),
    [filters],
  );

  const handleExpenseColumnFilterChange = useCallback(
    (k: string, v: string) => setFilter(k, v),
    [setFilter],
  );

  const expenseTypeMetaRef = useRef<Map<string, boolean>>(new Map());

  const syncExpenseTypeAuditMeta = useCallback(async (typeId: string): Promise<boolean> => {
    const tid = typeId.trim();
    if (!tid) return true;
    try {
      const byId = await listExpenseTypeLookupOptions({ id: tid, limit: 1 });
      if (byId.length > 0) {
        const row = byId[0]!;
        expenseTypeMetaRef.current.set(row.id, row.requiresAudit);
        return row.requiresAudit;
      }
      const rows = await listExpenseTypeLookupOptions({ limit: 100 });
      for (const r of rows) {
        expenseTypeMetaRef.current.set(r.id, r.requiresAudit);
      }
      const hit = rows.find((r) => r.id === tid);
      if (hit) return hit.requiresAudit;
      return expenseTypeMetaRef.current.get(tid) ?? true;
    } catch {
      return true;
    }
  }, []);

  const [expenseTypeId, setExpenseTypeId] = useState("");
  const [expenseTypeMetaStatus, setExpenseTypeMetaStatus] = useState<ExpenseTypeMetaStatus>("idle");
  const [typeRequiresAudit, setTypeRequiresAudit] = useState(true);
  const [money, setMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [expenseDate, setExpenseDate] = useState(() => todayYmdInUserTz());
  const [description, setDescription] = useState("");
  const [bankId, setBankId] = useState("");
  const [settlementAccountType, setSettlementAccountType] = useState<"bank" | "person">("bank");
  const [liabilityPersonId, setLiabilityPersonId] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<{
    expenseTypeId?: string;
    amount?: string;
    expenseDate?: string;
    bankId?: string;
    liabilityPersonId?: string;
  }>({});

  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadTypeOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      // API `lookupQuerySchema` allows max limit 100; higher values make the request fail and break the dropdown.
      const rows = await listExpenseTypeLookupOptions({ q: query || undefined, limit: 100 });
      const q = query.trim().toLowerCase();
      for (const r of rows) {
        expenseTypeMetaRef.current.set(r.id, r.requiresAudit);
      }
      return rows
        .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.code ?? "").toLowerCase().includes(q))
        .map((r) => ({
          value: r.id,
          label: r.code ? `${r.name} (${r.code})` : r.name,
        }));
    } catch {
      return [];
    }
  }, []);

  const handleExpenseTypeChange = useCallback((id: string) => {
    setExpenseTypeId(id);
    const tid = id.trim();
    if (tid) {
      setExpenseTypeMetaStatus("loading");
      // Avoid showing stale branch while id-based metadata refresh is in-flight.
      expenseTypeMetaRef.current.delete(tid);
      setTypeRequiresAudit(true);
    } else {
      setExpenseTypeMetaStatus("idle");
      setTypeRequiresAudit(true);
    }
    setBankId("");
    setLiabilityPersonId("");
    setSettlementAccountType("bank");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.bankId;
      delete next.liabilityPersonId;
      return next;
    });
  }, []);

  useEffect(() => {
    if (editingId) return;
    const id = expenseTypeId.trim();
    if (!id) {
      setTypeRequiresAudit(true);
      setExpenseTypeMetaStatus("idle");
      return;
    }
    setExpenseTypeMetaStatus("loading");
    let cancelled = false;
    void (async () => {
      const req = await syncExpenseTypeAuditMeta(id);
      if (!cancelled) {
        setTypeRequiresAudit(req);
        setExpenseTypeMetaStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expenseTypeId, editingId, syncExpenseTypeAuditMeta]);

  useEffect(() => {
    if (!platformCurrency) return;
    setMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency, editingId]);

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

  const resetForm = useCallback(() => {
    setEditingId(null);
    setExpenseTypeId("");
    setExpenseTypeMetaStatus("idle");
    setTypeRequiresAudit(true);
    setMoney(defaultOperatedMoneyValue(platformCurrency));
    setExpenseDate(todayYmdInUserTz());
    setDescription("");
    setBankId("");
    setSettlementAccountType("bank");
    setLiabilityPersonId("");
    setSelectedFiles([]);
    setErrors({});
  }, [platformCurrency]);

  const onFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  }, []);

  const onPreviewFile = useCallback((file: File) => {
    const objectUrl = URL.createObjectURL(file);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60 * 1000);
  }, []);

  const removeSelectedFile = useCallback((indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const onSubmit = async () => {
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    const next: typeof errors = {};
    if (!editingId && expenseTypeId.trim() && expenseTypeMetaStatus !== "ready") {
      toast.error("Wait for the expense type to finish loading.");
      return;
    }
    if (!expenseTypeId.trim()) next.expenseTypeId = "Expense type is required.";
    const operatedAmt = Number(money.amount);
    if (!money.amount.trim() || Number.isNaN(operatedAmt) || operatedAmt < 0.01) next.amount = "Enter a valid amount.";
    else if ((money.operatedCurrency || platformCurrency) !== platformCurrency) {
      const rate = Number(money.exchangeRate);
      if (!money.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
        next.amount = "Enter a valid exchange rate.";
      }
    }
    if (!expenseDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate.trim())) {
      next.expenseDate = "Expense date is required (YYYY-MM-DD).";
    }
    const skipsAudit = !editingId && typeRequiresAudit === false;
    if (skipsAudit) {
      if (settlementAccountType === "bank" && !bankId.trim()) {
        next.bankId = "Select a bank to debit for settlement.";
      }
      if (settlementAccountType === "person" && !liabilityPersonId.trim()) {
        next.liabilityPersonId = "Select a liability person for settlement.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const fx = toMoneyFxPayload(money, platformCurrency, "decimal");

    setLoading(true);
    try {
      if (editingId) {
        await updateExpense(editingId, {
          expenseTypeId: expenseTypeId.trim(),
          amount: fx.amount,
          operatedCurrency: fx.operatedCurrency,
          operatedAmount: fx.operatedAmount,
          exchangeRate: fx.exchangeRate,
          expenseDate: expenseDate.trim(),
          description: description.trim() || undefined,
          bankId: bankId.trim() || null,
        });
        toast.success("Expense updated.");
      } else {
        const createPayload =
          skipsAudit && settlementAccountType === "person"
            ? {
                expenseTypeId: expenseTypeId.trim(),
                amount: fx.amount,
                operatedCurrency: fx.operatedCurrency,
                operatedAmount: fx.operatedAmount,
                exchangeRate: fx.exchangeRate,
                expenseDate: expenseDate.trim(),
                description: description.trim() || undefined,
                liabilityPersonId: liabilityPersonId.trim(),
              }
            : {
                expenseTypeId: expenseTypeId.trim(),
                amount: fx.amount,
                operatedCurrency: fx.operatedCurrency,
                operatedAmount: fx.operatedAmount,
                exchangeRate: fx.exchangeRate,
                expenseDate: expenseDate.trim(),
                description: description.trim() || undefined,
                ...(skipsAudit && settlementAccountType === "bank"
                  ? { bankId: bankId.trim() }
                  : !skipsAudit
                    ? { bankId: bankId.trim() || undefined }
                    : {}),
              };
        const created = (await createExpense(createPayload)) as {
          _id?: string;
          id?: string;
          status?: string;
        } | null;
        const createdId = String(created?._id ?? created?.id ?? "").trim();
        const isApproved = created?.status === "approved";
        if (selectedFiles.length > 0 && createdId) {
          await uploadExpenseDocuments(createdId, selectedFiles);
          toast.success(
            isApproved
              ? "Expense created, approved, and documents uploaded."
              : "Expense created and documents uploaded. Pending audit.",
          );
        } else if (selectedFiles.length > 0) {
          toast.warning("Expense created, but document upload was skipped because ID was unavailable.");
        } else {
          toast.success(
            isApproved ? "Expense created and approved." : "Expense created. Pending audit.",
          );
        }
      }
      resetForm();
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      const msg = editingId ? "Failed to update expense" : "Failed to create expense";
      toast.error(getApiErrorMessage(error, msg));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (row: ExpenseRow) => {
    setEditingId(row.id);
    const tid = row.expenseTypeId || "";
    setExpenseTypeId(tid);
    setExpenseTypeMetaStatus("loading");
    const req = tid ? expenseTypeMetaRef.current.get(tid) : undefined;
    setTypeRequiresAudit(req === undefined ? true : req);
    void (async () => {
      if (!tid) {
        setExpenseTypeMetaStatus("ready");
        return;
      }
      const synced = await syncExpenseTypeAuditMeta(tid);
      setTypeRequiresAudit(synced);
      setExpenseTypeMetaStatus("ready");
    })();
    setSettlementAccountType("bank");
    setLiabilityPersonId("");
    setMoney({
      amount: String(row.operatedAmount ?? row.amount),
      operatedCurrency: row.operatedCurrency || platformCurrency || "",
      exchangeRate: String(row.exchangeRate ?? 1),
    });
    setExpenseDate(row.expenseDate || todayYmdInUserTz());
    setDescription(row.description || "");
    setBankId(row.bankId || "");
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "expenseDate",
        label: "Date",
        ...tableColumnPresets.dateCol,
        sortable: true,
        filterType: "date" as const,
        filterKey: "expenseDate_from",
        filterKeyTo: "expenseDate_to",
        operatorKey: "expenseDate_op",
      },
      {
        field: "expenseTypeName",
        label: "Type",
        render: (row: ExpenseRow) => row.expenseTypeName || "—",
        minWidth: 150,
        filterType: "autocomplete" as const,
        filterKey: "expenseTypeId",
        filterLoadOptions: loadTypeOptions,
      },
      {
        field: "bankName",
        label: "Bank",
        render: (row: ExpenseRow) => row.bankName || "—",
        minWidth: 150,
        filterType: "autocomplete" as const,
        filterKey: "bankId",
        filterLoadOptions: loadBankOptions,
      },
      {
        field: "amount",
        label: "Amount",
        render: (row: ExpenseRow) => row.amount.toLocaleString(),
        sortable: true,
        minWidth: 110,
        filterType: "number" as const,
        filterKey: "amount",
        filterKeyTo: "amount_to",
        operatorKey: "amount_op",
      },
      {
        field: "operatedCurrency",
        label: "Operated Currency",
        render: (row: ExpenseRow) => row.operatedCurrency || "—",
        sortable: false,
        minWidth: 120,
      },
      {
        field: "exchangeRate",
        label: "Exchange Rate",
        render: (row: ExpenseRow) =>
          row.exchangeRate != null && Number.isFinite(row.exchangeRate) ? String(row.exchangeRate) : "—",
        sortable: false,
        minWidth: 110,
      },
      {
        field: "status",
        label: "Status",
        ...tableColumnPresets.statusCol,
        render: (row: ExpenseRow) => <TableStatusBadge status={row.status} />,
        filterType: "select" as const,
        filterKey: "status",
        filterOptions: [
          { label: "Pending", value: "pending_audit" },
          { label: "Approved", value: "approved" },
          { label: "Rejected", value: "rejected" },
        ],
      },
      {
        field: "createdBy",
        label: "Created By",
        render: (row: ExpenseRow) => row.createdByName || "—",
        minWidth: 150,
        filterType: "autocomplete" as const,
        filterKey: "createdBy",
        filterLoadOptions: loadUserOptions,
      },
      {
        field: "actions",
        label: "Actions",
        isActionColumn: true,
        ...tableColumnPresets.actionsCol,
        render: (row: ExpenseRow) =>
          row.status === "pending_audit" ? (
            <Button
              size="sm"
              variant="secondary"
              startIcon={<IconPencil size={16} />}
              onClick={() => handleEditClick(row)}
            >
              Edit
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [loadTypeOptions, loadBankOptions, loadUserOptions, loadLiabilityPersonOptions],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 pb-4">
      <div className="w-full shrink-0">
        <FormContainer
          className="!flex-none"
          contentOverflow="visible"
          title={editingId ? "Update pending expense" : "Add new expense"}
          description={
            editingId
              ? "Correct the details below. Changes will be saved to the existing pending record."
              : "Enter the details for a new business expense. Types that skip audit are approved on save and require settlement (bank or liability person)."
          }
        >
          <FormGrid className="md:grid-cols-4">
            <div className="space-y-1.5">
              <FieldLabel>Expense type *</FieldLabel>
              <AutocompleteField
                value={expenseTypeId}
                onChange={handleExpenseTypeChange}
                loadOptions={loadTypeOptions}
                placeholder="Select type"
              />
              <FieldError message={errors.expenseTypeId} />
            </div>
            <OperatedMoneyFields
              value={money}
              onChange={setMoney}
              amountLabel="Amount *"
              roundMode="decimal"
              minAmount={0.01}
              idPrefix="expense"
            />
            {errors.amount ? (
              <div className="col-span-full">
                <FieldError message={errors.amount} />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <FieldLabel>Expense date *</FieldLabel>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              <FieldError message={errors.expenseDate} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Description (optional)</FieldLabel>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Memo" />
            </div>
            {!editingId && (
              <div className="space-y-1.5">
                <FieldLabel>Documents (optional)</FieldLabel>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
                  onChange={onFilesSelected}
                />
                <p className="text-[10px] text-muted-foreground">
                  Upload up to 5 files (PDF/JPG/JPEG/PNG/WEBP). Max 10MB each.
                </p>
                {selectedFiles.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-600">{selectedFiles.length} file(s) selected</p>
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-[var(--border)] bg-slate-50 p-2">
                      {selectedFiles.map((file, index) => (
                        <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-medium text-slate-700">{file.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {formatFileSize(file.size)} • {file.type || "file"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => onPreviewFile(file)}
                            >
                              View
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => removeSelectedFile(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            {editingId ? (
              <div className="md:col-span-4 space-y-1.5 border-t border-[var(--border)] pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel>Debit account (optional)</FieldLabel>
                    <p className="text-[10px] text-muted-foreground">Optional on the pending record.</p>
                  </div>
                  <div className="w-full max-w-xs">
                    <AutocompleteField
                      value={bankId}
                      onChange={setBankId}
                      loadOptions={loadBankOptions}
                      placeholder="Search bank…"
                    />
                  </div>
                </div>
              </div>
            ) : !expenseTypeId.trim() ? (
              <div className="md:col-span-4 space-y-1.5 border-t border-[var(--border)] pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel>Debit account (optional)</FieldLabel>
                    <p className="text-[10px] text-muted-foreground">
                      Optional draft bank; after you choose an expense type, settlement may be required instead.
                    </p>
                  </div>
                  <div className="w-full max-w-xs">
                    <AutocompleteField
                      value={bankId}
                      onChange={setBankId}
                      loadOptions={loadBankOptions}
                      placeholder="Search bank…"
                    />
                  </div>
                </div>
              </div>
            ) : expenseTypeMetaStatus === "loading" ? (
              <div className="md:col-span-4 border-t border-[var(--border)] pt-4">
                <p className="text-sm text-slate-500">Loading expense type…</p>
              </div>
            ) : expenseTypeMetaStatus === "ready" && typeRequiresAudit === false ? (
              <div className="md:col-span-4 space-y-3 border-t border-[var(--border)] pt-4">
                <div className="space-y-0.5">
                  <FieldLabel>Settlement *</FieldLabel>
                  <p className="text-[10px] text-muted-foreground">
                    This type is approved on save — choose bank or person settlement (same as audit approval).
                  </p>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Settlement account type *</FieldLabel>
                  <select
                    className="w-full max-w-xs rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
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
                    <option value="person">Person</option>
                  </select>
                </div>
                {settlementAccountType === "bank" ? (
                  <div className="space-y-1.5">
                    <FieldLabel>Bank account to debit *</FieldLabel>
                    <AutocompleteField
                      value={bankId}
                      onChange={setBankId}
                      loadOptions={loadBankOptions}
                      placeholder="Select bank…"
                    />
                    <FieldError message={errors.bankId} />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <FieldLabel>Person account to credit *</FieldLabel>
                    <AutocompleteField
                      value={liabilityPersonId}
                      onChange={setLiabilityPersonId}
                      loadOptions={loadLiabilityPersonOptions}
                      placeholder="Select liability person…"
                    />
                    <FieldError message={errors.liabilityPersonId} />
                  </div>
                )}
              </div>
            ) : expenseTypeMetaStatus === "ready" && typeRequiresAudit ? (
              <div className="md:col-span-4 space-y-1.5 border-t border-[var(--border)] pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel>Debit account (optional)</FieldLabel>
                    <p className="text-[10px] text-muted-foreground">
                      Optional draft bank until an auditor approves and settles.
                    </p>
                  </div>
                  <div className="w-full max-w-xs">
                    <AutocompleteField
                      value={bankId}
                      onChange={setBankId}
                      loadOptions={loadBankOptions}
                      placeholder="Search bank…"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </FormGrid>
          <FormActions className="justify-between px-5 py-4">
            <Button
              type="button"
              variant={editingId ? "success" : "primary"}
              onClick={() => void onSubmit()}
              disabled={loading}
              startIcon={editingId ? <IconDeviceFloppy size={18} /> : <IconPlus size={18} />}
            >
              {loading ? (editingId ? "Updating…" : "Adding…") : editingId ? "Update expense" : "Add expense"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm} disabled={loading} startIcon={<IconX size={18} />}>
                Cancel edit
              </Button>
            )}
          </FormActions>
        </FormContainer>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ListingPageContainer
          title="Recent expense entries"
          description="View and manage your recently submitted expenses. Click edit on pending items to correct details."
          density="compact"
          fullWidth
          secondaryButtonLabel="Reset filters"
          onSecondaryClick={() => clearFilters({ keepQuickSearch: true })}
        >
          <PaginatedTableReference
            key={tableKey}
            columns={columns}
            fetcher={expenseListFetcher}
            height="calc(100vh - 400px)"
            showSearch={false}
            showPagination={false}
            onTotalChange={setTotalCount}
            columnFilterValues={expenseTableColumnFilterValues}
            onColumnFilterChange={handleExpenseColumnFilterChange}
            filterParams={expenseTableFilterParams}
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
    </div>
  );
}
