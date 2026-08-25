"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  IconCheck,
  IconX,
  IconCurrencyRupee,
  IconClock,
  IconCreditCard,
  IconFileText,
  IconPaperclip,
  IconUser,
  IconRefresh,
} from "@tabler/icons-react";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FieldError } from "@/components/common/FieldError";
import { Button } from "@/components/ui/Button";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { DetailsSidebar } from "@/components/common/DetailsSidebar";
import { ConfirmSensitiveActionDialog } from "@/components/common/ConfirmSensitiveActionDialog";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import {
  approveExpense,
  getExpenseDocumentViewUrl,
  listExpensesNormalized,
  rejectExpense,
} from "@/services/expenseService";
import { listBankLookupOptions, listExpenseTypeLookupOptions } from "@/services/lookupService";
import { listLiabilityPersonsNormalized } from "@/services/liabilityService";
import { userService } from "@/services/userService";
import type { ExpenseRow } from "@/types/expense";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { getApiErrorMessage } from "@/lib/apiError";
import { REASON_TYPES } from "@/lib/constants/reasonTypes";
import { formatDateTimeForUser } from "@/lib/userTimezone";

const COLUMN_FILTER_KEYS = [
  "q",
  "status",
  "expenseTypeId",
  "bankId",
  "amount",
  "amount_to",
  "amount_op",
  "createdByName",
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

type ExpenseUserRow = {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
};

function buildUserLabel(row: ExpenseUserRow): string {
  const fn = row.fullName?.trim();
  const un = row.username?.trim();
  if (fn && un) return `${fn} (${un})`;
  return fn || un || "";
}

// ─── Detail card for sidebar ──────────────────────────────────────────────

function ExpenseDetailCard({
  expense,
  onViewDocument,
  viewingDocIndex,
}: {
  expense: ExpenseRow;
  onViewDocument: (index: number) => void;
  viewingDocIndex: number | null;
}) {
  const items = [
    {
      icon: <IconCreditCard className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Type",
      value: expense.expenseTypeName || "—",
    },
    {
      icon: <IconCurrencyRupee className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Amount",
      value: expense.amount.toLocaleString(),
    },
    {
      icon: <IconClock className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Expense date",
      value: expense.expenseDate || "—",
    },
    {
      icon: <IconUser className="size-4 shrink-0 text-[var(--brand-primary)]" />,
      label: "Created by",
      value: expense.createdByName || "—",
    },
    {
      icon: <IconClock className="size-4 shrink-0 text-gray-400" />,
      label: "Audit created",
      value: formatDateTimeForUser(expense.createdAt),
    },
    {
      icon: <IconFileText className="size-4 shrink-0 text-gray-400" />,
      label: "Memo",
      value: expense.description || "—",
    },
    {
      icon: <IconCreditCard className="size-4 shrink-0 text-gray-400" />,
      label: "Settlement",
      value:
        expense.settlementAccountType === "bank"
          ? `Bank: ${expense.bankName || "—"}`
          : expense.settlementAccountType === "person"
            ? `Person: ${expense.liabilityPersonName || "—"}`
            : "Pending",
    },
    {
      icon: <IconFileText className="size-4 shrink-0 text-gray-400" />,
      label: "Liability Link",
      value: expense.liabilityEntryId ? `Entry ${expense.liabilityEntryId}` : "—",
    },
  ];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Expense Info</p>
        <TableStatusBadge status={expense.status} />
      </div>
      <dl className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2.5">
            <span className="mt-0.5">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-800">{item.value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
          <IconPaperclip className="size-3.5" />
          Documents
        </div>
        {Array.isArray(expense.documents) && expense.documents.length > 0 ? (
          <div className="space-y-2">
            {expense.documents.map((doc, index) => (
              <div
                key={`${doc.path}-${index}`}
                className="flex items-center justify-between rounded-md border border-[var(--border)] bg-white px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-800">{doc.filename}</p>
                  <p className="text-[11px] text-gray-500">
                    {formatFileSize(doc.size)} • {doc.mime_type || "file"} • {formatDateTimeForUser(doc.uploaded_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  disabled={viewingDocIndex === index}
                  onClick={() => onViewDocument(index)}
                >
                  {viewingDocIndex === index ? "Opening..." : "View"}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No documents uploaded.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ExpenseAuditClient() {
  const { formatMoney } = useFormatMoney();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("status")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("status", "pending_audit");
    router.replace(`${pathname}?${next.toString()}`);
  }, [pathname, router, searchParams]);

  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    listingState;

  const expenseAuditListFetcher = useCallback(
    async (params: Record<string, unknown>) => listExpensesNormalized(params),
    [],
  );

  const expenseAuditTableColumnFilterValues = useMemo(() => ({ ...filters }), [filters]);

  const expenseAuditTableFilterParams = useMemo(
    () => ({
      q: toOptionalFilterValue(filters.q || ""),
      status: toOptionalFilterValue(filters.status || ""),
      expenseTypeId: toOptionalFilterValue(filters.expenseTypeId || ""),
      bankId: toOptionalFilterValue(filters.bankId || ""),
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

  const handleExpenseAuditColumnFilterChange = useCallback(
    (k: string, v: string) => setFilter(k, v),
    [setFilter],
  );

  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);

  const [settlementAccountType, setSettlementAccountType] = useState<"bank" | "person">("bank");
  const [bankId, setBankId] = useState("");
  const [liabilityPersonId, setLiabilityPersonId] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReasonId, setRejectReasonId] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [viewingDocIndex, setViewingDocIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ bankId?: string; liabilityPersonId?: string }>({});

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

  const loadTypeOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const rows = await listExpenseTypeLookupOptions({ q: query || undefined, limit: 50 });
      const q = query.trim().toLowerCase();
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

  const loadCreatedByOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await userService.list({
        q: query || undefined,
        page: 1,
        limit: 20,
        sortBy: "fullName",
        sortOrder: "asc",
      });
      const rows = Array.isArray(response?.data) ? (response.data as ExpenseUserRow[]) : [];
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
  }, []);

  const closeSidebar = useCallback(() => {
    setSelectedExpense(null);
    setSettlementAccountType("bank");
    setBankId("");
    setLiabilityPersonId("");
    setViewingDocIndex(null);
    setErrors({});
  }, []);

  const onViewDocument = useCallback(
    async (docIndex: number) => {
      if (!selectedExpense) return;
      setViewingDocIndex(docIndex);
      try {
        const data = await getExpenseDocumentViewUrl(selectedExpense.id, docIndex);
        const url = String(data.url || "").trim();
        if (!url) {
          toast.error("Document URL is unavailable.");
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "Failed to open document"));
      } finally {
        setViewingDocIndex(null);
      }
    },
    [selectedExpense],
  );

  const onApproveSubmit = async () => {
    if (!selectedExpense) return;
    const next: typeof errors = {};
    if (settlementAccountType === "bank" && !bankId.trim()) next.bankId = "Bank is required to approve.";
    if (settlementAccountType === "person" && !liabilityPersonId.trim()) {
      next.liabilityPersonId = "Person is required to approve.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setActionLoading(true);
    try {
      await approveExpense(
        selectedExpense.id,
        settlementAccountType === "bank"
          ? { settlementAccountType: "bank", bankId: bankId.trim() }
          : { settlementAccountType: "person", liabilityPersonId: liabilityPersonId.trim() },
      );
      toast.success(
        settlementAccountType === "bank"
          ? "Expense approved; bank debited."
          : "Expense approved; liability posted against person.",
      );
      closeSidebar();
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to approve expense"));
    } finally {
      setActionLoading(false);
    }
  };

  const onRejectSubmit = async () => {
    if (!selectedExpense) return;
    if (!rejectReasonId.trim()) {
      toast.error("Select a rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      await rejectExpense(selectedExpense.id, {
        reasonId: rejectReasonId.trim(),
        remark: rejectRemark.trim() || undefined,
      });
      toast.success("Expense rejected.");
      setRejectOpen(false);
      setRejectReasonId("");
      setRejectRemark("");
      closeSidebar();
      setTableKey((k) => k + 1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to reject expense"));
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "expenseDate",
        label: "Expense date",
        sortable: true,
        filterType: "date" as const,
        filterKey: "expenseDate_from",
        filterKeyTo: "expenseDate_to",
        operatorKey: "expenseDate_op",
        ...tableColumnPresets.dateCol,
        render: (row: ExpenseRow) => (row.expenseDate ? row.expenseDate : "—"),
      },
      {
        field: "expenseTypeName",
        label: "Type",
        sortable: false,
        filterType: "autocomplete" as const,
        filterKey: "expenseTypeId",
        filterLoadOptions: loadTypeOptions,
        render: (row: ExpenseRow) => row.expenseTypeName ?? "—",
        ...tableColumnPresets.nameCol,
      },
      {
        field: "amount",
        label: "Amount",
        sortable: true,
        minWidth: 100,
        filterType: "number" as const,
        filterKey: "amount",
        filterKeyTo: "amount_to",
        operatorKey: "amount_op",
        render: (row: ExpenseRow) => (row.amount != null ? formatMoney(row.amount) : "—"),
      },
      {
        field: "status",
        label: "Status",
        ...tableColumnPresets.statusCol,
        render: (row: ExpenseRow) => <TableStatusBadge status={row.status} />,
        sortable: true,
        filterType: "select" as const,
        filterKey: "status",
        filterOptions: [
          { value: "pending_audit", label: "Pending audit" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ],
      },
      {
        field: "bankName",
        label: "Suggested bank",
        render: (row: ExpenseRow) => row.bankName || "—",
        ...tableColumnPresets.nameCol,
        sortable: false,
      },
      {
        field: "createdByName",
        label: "Created by",
        render: (row: ExpenseRow) => row.createdByName ?? "—",
        minWidth: 140,
        sortable: false,
        filterType: "autocomplete" as const,
        filterKey: "createdBy",
        filterLoadOptions: loadCreatedByOptions,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        minWidth: 96,
        render: (row: ExpenseRow) => {
          if (row.status !== "pending_audit") return <span className="text-xs text-gray-400">—</span>;
          if (selectedExpense?.id === row.id) {
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
    [selectedExpense, loadCreatedByOptions, loadTypeOptions],
  );

  return (
    <>
      <ListingPageContainer
        title="Expense / Audit"
        description="Pending expenses awaiting audit action. Click a row to open the sidebar for approval or rejection."
        density="compact"
        fullWidth
        secondaryButtonLabel="Reset filters"
        onSecondaryClick={() => clearFilters({ keepQuickSearch: true })}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {!selectedExpense && (
            <div className="mb-3 flex shrink-0 items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
              <IconUser className="size-4 shrink-0" />
              <span>
                <strong>Tip:</strong> Click any <strong>pending</strong> row to open the sidebar.
              </span>
            </div>
          )}

          <PaginatedTableReference
            key={tableKey}
            columns={columns}
            fetcher={expenseAuditListFetcher}
            height="calc(100vh - 280px)"
            showSearch={false}
            showPagination={false}
            onTotalChange={setTotalCount}
            columnFilterValues={expenseAuditTableColumnFilterValues}
            onColumnFilterChange={handleExpenseAuditColumnFilterChange}
            filterParams={expenseAuditTableFilterParams}
            page={page}
            limit={limit}
            sortBy={sortBy || "createdAt"}
            sortOrder={sortOrder || "desc"}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            onSortChange={(field, order) => setSort(field, order)}
            onRowClick={(row) => setSelectedExpense(row as ExpenseRow)}
            selectedRowKey={selectedExpense?.id ?? null}
            getRowKey={(row) => String((row as ExpenseRow).id)}
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
        open={!!selectedExpense}
        title="Expense Audit"
        subtitle={selectedExpense ? `Amount: ${formatMoney(selectedExpense.amount)}` : undefined}
        onClose={closeSidebar}
        width="400px"
      >
        {selectedExpense && (
          <div className="flex flex-col gap-5">
            <ExpenseDetailCard
              expense={selectedExpense}
              onViewDocument={(docIndex) => void onViewDocument(docIndex)}
              viewingDocIndex={viewingDocIndex}
            />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <FieldLabel>Settlement Account Type *</FieldLabel>
                <select
                  className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  value={settlementAccountType}
                  onChange={(e) => {
                    const nextType = e.target.value === "person" ? "person" : "bank";
                    setSettlementAccountType(nextType);
                    setErrors({});
                  }}
                  disabled={selectedExpense.status !== "pending_audit" || actionLoading}
                >
                  <option value="bank">Bank</option>
                  <option value="person">Person</option>
                </select>
              </div>
              <div className="space-y-1.5">
                {settlementAccountType === "bank" ? (
                  <>
                    <FieldLabel>Bank account to debit *</FieldLabel>
                    <AutocompleteField
                      value={bankId}
                      onChange={setBankId}
                      loadOptions={loadBankOptions}
                      placeholder="Select bank…"
                      disabled={selectedExpense.status !== "pending_audit" || actionLoading}
                    />
                    <FieldError message={errors.bankId} />
                  </>
                ) : (
                  <>
                    <FieldLabel>Person account to credit *</FieldLabel>
                    <AutocompleteField
                      value={liabilityPersonId}
                      onChange={setLiabilityPersonId}
                      loadOptions={loadLiabilityPersonOptions}
                      placeholder="Select liability person…"
                      disabled={selectedExpense.status !== "pending_audit" || actionLoading}
                    />
                    <FieldError message={errors.liabilityPersonId} />
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
                <Button
                  variant="success"
                  startIcon={<IconCheck size={18} />}
                  onClick={() => void onApproveSubmit()}
                  disabled={selectedExpense.status !== "pending_audit" || actionLoading}
                  className="w-full justify-center"
                >
                  {actionLoading ? "Processing…" : "Approve & Debit"}
                </Button>
                <Button
                  variant="danger"
                  startIcon={<IconX size={18} />}
                  onClick={() => {
                    setRejectOpen(true);
                    setRejectReasonId("");
                    setRejectRemark("");
                  }}
                  disabled={selectedExpense.status !== "pending_audit" || actionLoading}
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

      <ConfirmSensitiveActionDialog
        title="Reject Expense"
        open={rejectOpen}
        reasonType={REASON_TYPES.EXPENSE_AUDIT_REJECT}
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
