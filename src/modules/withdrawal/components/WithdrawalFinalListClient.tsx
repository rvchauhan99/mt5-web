 "use client";

import { useCallback, useMemo, useState } from "react";
import { IconHistory, IconPencil, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { DetailsSidebar } from "@/components/common/DetailsSidebar";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FieldError } from "@/components/common/FieldError";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/shadcn/textarea";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { useExport } from "@/hooks/useExport";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { useAuth } from "@/context/AuthContext";
import { NAV_PERMISSIONS } from "@/lib/constants/navPermissions";
import { getApiErrorMessage } from "@/lib/apiError";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { listBankLookupOptions } from "@/services/lookupService";
import { listReasonOptions } from "@/services/reasonService";
import { REASON_TYPES } from "@/lib/constants/reasonTypes";
import {
  amendWithdrawal,
  deleteWithdrawal,
  exportWithdrawals,
  listWithdrawalsNormalized,
  normalizeWithdrawal,
} from "@/services/withdrawalService";
import type { WithdrawalRow } from "@/types/withdrawal";
import { withdrawalStatusApiParam } from "@/modules/withdrawal/withdrawalListingStatusFilter";
import { WITHDRAWAL_FINAL_FILTER_KEYS } from "@/modules/withdrawal/withdrawalFinalListConstants";
import { WithdrawalFinalListFilterPanel } from "@/modules/withdrawal/components/WithdrawalFinalListFilterPanel";
import {
  currentDateTimeLocalValue,
  formatDateTimeForUser,
  utcIsoToDateTimeLocalValue,
} from "@/lib/userTimezone";

function toOptionalFilterValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function WithdrawalFinalListClient() {
  const { formatWholeMoney } = useFormatMoney();
  const { user } = useAuth();
  const listingState = useListingQueryStateReference({
    defaultLimit: 50,
    filterKeys: [...WITHDRAWAL_FINAL_FILTER_KEYS],
  });
  const {
    page,
    limit,
    q,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setLimit,
    setSort,
    setQ,
    setFilters,
    clearFilters,
  } = listingState;

  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRow | null>(null);
  const [amendOpen, setAmendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [amendAmount, setAmendAmount] = useState("");
  const [amendRequestedAt, setAmendRequestedAt] = useState(currentDateTimeLocalValue());
  const [amendPayoutBankId, setAmendPayoutBankId] = useState("");
  const [amendPayoutBankDefault, setAmendPayoutBankDefault] = useState<AutocompleteOption | null>(null);
  const [amendUtr, setAmendUtr] = useState("");
  const [amendReasonId, setAmendReasonId] = useState("");
  const [amendReasonDefault, setAmendReasonDefault] = useState<AutocompleteOption | null>(null);
  const [amendReason, setAmendReason] = useState("");
  /** Matches the row when the amend dialog was opened (bank vs liability-person payout). */
  const [amendIsPersonPayout, setAmendIsPersonPayout] = useState(false);
  const [amendLoading, setAmendLoading] = useState(false);
  const [amendErrors, setAmendErrors] = useState<{
    amount?: string;
    payoutBankId?: string;
    utr?: string;
    reason?: string;
  }>({});

  const canAmend = useMemo(() => {
    if (!user) return false;
    if (user.role === "superadmin") return true;
    return (user.permissions ?? []).includes(NAV_PERMISSIONS.WITHDRAWAL_FINAL_VIEW);
  }, [user]);
  const canDelete = user?.role === "superadmin";

  const fetcher = useCallback(async (params: Record<string, unknown>) => {
    return listWithdrawalsNormalized("final", params);
  }, []);

  const filterParams = useMemo(
    () => ({
      q: toOptionalFilterValue(q || ""),
      utr: toOptionalFilterValue(filters.utr || ""),
      utr_op: toOptionalFilterValue(filters.utr_op || ""),
      playerName: toOptionalFilterValue(filters.playerName || ""),
      playerName_op: toOptionalFilterValue(filters.playerName_op || ""),
      bankName: toOptionalFilterValue(filters.bankName || ""),
      bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
      status: withdrawalStatusApiParam(filters.status),
      hasAmendment: toOptionalFilterValue(filters.hasAmendment || ""),
      amount: toOptionalFilterValue(filters.amount || ""),
      amount_to: toOptionalFilterValue(filters.amount_to || ""),
      amount_op: toOptionalFilterValue(filters.amount_op || ""),
      payableAmount: toOptionalFilterValue(filters.payableAmount || ""),
      payableAmount_to: toOptionalFilterValue(filters.payableAmount_to || ""),
      payableAmount_op: toOptionalFilterValue(filters.payableAmount_op || ""),
      createdBy: toOptionalFilterValue(filters.createdBy || ""),
      approvedBy: toOptionalFilterValue(filters.approvedBy || ""),
      createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
      createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
      createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
    }),
    [filters, q],
  );

  const { exporting, handleExport } = useExport(exportWithdrawals, {
    fileName: `withdrawals-final-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      view: "final",
      page: 1,
      limit: 10000,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
      q: toOptionalFilterValue(q || ""),
      utr: toOptionalFilterValue(filters.utr || ""),
      utr_op: toOptionalFilterValue(filters.utr_op || ""),
      playerName: toOptionalFilterValue(filters.playerName || ""),
      playerName_op: toOptionalFilterValue(filters.playerName_op || ""),
      bankName: toOptionalFilterValue(filters.bankName || ""),
      bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
      status: withdrawalStatusApiParam(filters.status),
      hasAmendment: toOptionalFilterValue(filters.hasAmendment || ""),
      amount: toOptionalFilterValue(filters.amount || ""),
      amount_to: toOptionalFilterValue(filters.amount_to || ""),
      amount_op: toOptionalFilterValue(filters.amount_op || ""),
      payableAmount: toOptionalFilterValue(filters.payableAmount || ""),
      payableAmount_to: toOptionalFilterValue(filters.payableAmount_to || ""),
      payableAmount_op: toOptionalFilterValue(filters.payableAmount_op || ""),
      createdBy: toOptionalFilterValue(filters.createdBy || ""),
      approvedBy: toOptionalFilterValue(filters.approvedBy || ""),
      createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
      createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
      createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
    });
  }, [handleExport, filters, sortBy, sortOrder, q]);

  const loadPayoutBankOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
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

  const loadAmendReasonOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    const rows = await listReasonOptions(REASON_TYPES.WITHDRAWAL_FINAL_AMEND);
    const qn = query.trim().toLowerCase();
    return rows
      .filter((r) => (qn ? r.reason.toLowerCase().includes(qn) : true))
      .map((r) => ({ value: r.id, label: r.reason }));
  }, []);

  const openAmendDialog = useCallback((row: WithdrawalRow) => {
    if (!canAmend || row.status !== "approved") return;
    const isLp = row.payoutSettlementType === "person";
    setAmendIsPersonPayout(isLp);
    setAmendAmount(String(row.amount));
    setAmendRequestedAt(utcIsoToDateTimeLocalValue(row.requestedAt));
    setAmendPayoutBankId(isLp ? "" : row.payoutBankId?.trim() || "");
    setAmendPayoutBankDefault(
      !isLp && row.payoutBankId && row.payoutBankName
        ? { value: row.payoutBankId, label: row.payoutBankName }
        : null,
    );
    setAmendUtr(row.utr ?? "");
    setAmendReasonId("");
    setAmendReasonDefault(null);
    setAmendReason("");
    setAmendErrors({});
    setAmendOpen(true);
  }, [canAmend]);

  const openDeleteDialog = useCallback((row: WithdrawalRow) => {
    if (!canDelete) return;
    setSelectedWithdrawal(row);
    setDeleteOpen(true);
  }, [canDelete]);

  const submitAmend = useCallback(async () => {
    if (!selectedWithdrawal) return;
    const next: typeof amendErrors = {};
    const amountNum = Number(amendAmount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      next.amount = "Amount must be a whole number ≥ 0.";
    } else if (!Number.isInteger(amountNum)) {
      next.amount = "Amount must be a whole number (no decimals).";
    }
    if (!amendIsPersonPayout && !amendPayoutBankId.trim()) next.payoutBankId = "Payout bank is required.";
    if (!amendUtr.trim()) next.utr = "Reference number is required.";
    if (!amendReasonId.trim()) next.reason = "Reason selection is required.";
    if (Object.keys(next).length) {
      setAmendErrors(next);
      return;
    }
    setAmendLoading(true);
    try {
      const amendBody = {
        amount: amountNum,
        reverseBonus: 0,
        utr: amendUtr.trim(),
        requestedAt: amendRequestedAt || undefined,
        reasonId: amendReasonId.trim(),
        remark: amendReason.trim() || undefined,
      };
      const raw = await amendWithdrawal(selectedWithdrawal.id, {
        ...amendBody,
        ...(amendIsPersonPayout ? {} : { payoutBankId: amendPayoutBankId.trim() }),
      });
      toast.success("Withdrawal amended.");
      setAmendOpen(false);
      setTableKey((k) => k + 1);
      if (raw && typeof raw === "object") {
        setSelectedWithdrawal(normalizeWithdrawal(raw as Record<string, unknown>));
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Could not amend withdrawal."));
    } finally {
      setAmendLoading(false);
    }
  }, [
    selectedWithdrawal,
    amendAmount,
    amendRequestedAt,
    amendPayoutBankId,
    amendUtr,
    amendReasonId,
    amendReason,
    amendIsPersonPayout,
  ]);

  const submitDelete = useCallback(async () => {
    if (!selectedWithdrawal) return;
    setDeleteLoading(true);
    try {
      await deleteWithdrawal(selectedWithdrawal.id);
      toast.success("Withdrawal deleted.");
      setDeleteOpen(false);
      setSelectedWithdrawal(null);
      setTableKey((k) => k + 1);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Could not delete withdrawal."));
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedWithdrawal]);

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "playerName",
        label: "Trader",
        render: (row: WithdrawalRow) => row.playerName,
        ...tableColumnPresets.nameCol,
        sortable: true,
      },
      {
        field: "account",
        label: "Origin Bank",
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
        field: "payoutBankOrLp",
        label: "Payout bank / Liable person",
        minWidth: 180,
        sortable: false,
        render: (row: WithdrawalRow) =>
          row.payoutSettlementType === "person"
            ? row.payoutLiabilityPersonName != null && row.payoutLiabilityPersonName !== ""
              ? `LP: ${row.payoutLiabilityPersonName}`
              : "LP: —"
            : row.payoutBankName || "—",
      },
      {
        field: "utr",
        label: "Reference Number",
        sortable: true,
        render: (row: WithdrawalRow) => row.utr || "—",
      },
      {
        field: "amount",
        label: "Requested",
        render: (row: WithdrawalRow) => formatWholeMoney(row.amount),
        sortable: true,
      },
      {
        field: "payableAmount",
        label: "Payable",
        render: (row: WithdrawalRow) => (row.payableAmount != null ? formatWholeMoney(row.payableAmount) : "—"),
        sortable: true,
        minWidth: 100,
      },
      {
        field: "amendmentCount",
        label: "Amend.",
        render: (row: WithdrawalRow) =>
          row.amendmentCount != null && row.amendmentCount > 0 ? String(row.amendmentCount) : "—",
        minWidth: 72,
        sortable: false,
      },
      {
        field: "status",
        label: "Status",
        ...tableColumnPresets.statusCol,
        render: (row: WithdrawalRow) => <TableStatusBadge status={row.status} />,
      },
      {
        field: "createdByName",
        label: "Created By",
        render: (row: WithdrawalRow) => row.createdByName || "—",
        minWidth: 150,
      },
      {
        field: "approvedByName",
        label: "Approved By",
        render: (row: WithdrawalRow) => row.approvedByName || "—",
        minWidth: 150,
      },
      {
        field: "createdAt",
        label: "Transaction at",
        sortable: true,
        ...tableColumnPresets.dateCol,
        render: (row: WithdrawalRow) =>
          formatDateTimeForUser(row.requestedAt ?? row.createdAt),
      },
    ],
    [],
  );

  const historyRows = useMemo(() => {
    const list = selectedWithdrawal?.amendmentHistory ?? [];
    return [...list].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [selectedWithdrawal?.amendmentHistory]);

  return (
    <>
      <ListingPageContainer
        title="Withdrawal / Final list"
        description="All withdrawals including rejections. Person intermediary payouts appear as “LP: …” in the payout column. Click a row for details and amendment activity."
        density="compact"
        fullWidth
        secondaryButtonLabel="Reset filters"
        onSecondaryClick={() => clearFilters({ keepQuickSearch: true })}
        exportButtonLabel="Export"
        onExportClick={onExportClick}
        exportDisabled={exporting}
        filters={
          <WithdrawalFinalListFilterPanel
            q={q}
            filters={filters}
            setQ={setQ}
            setFilters={setFilters}
            onClear={() => clearFilters({ keepQuickSearch: false })}
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="min-h-0 flex-1 overflow-hidden">
            <PaginatedTableReference
              key={tableKey}
              columns={columns}
              fetcher={fetcher}
              height="calc(100vh - 300px)"
              showSearch={false}
              showPagination={false}
              onTotalChange={setTotalCount}
              filterParams={filterParams}
              page={page}
              limit={limit}
              sortBy={sortBy || "createdAt"}
              sortOrder={sortOrder || "desc"}
              onPageChange={(zeroBased) => setPage(zeroBased + 1)}
              onRowsPerPageChange={setLimit}
              onSortChange={(field, order) => setSort(field, order)}
              compactDensity={false}
              getRowKey={(row) => (row as WithdrawalRow).id}
              selectedRowKey={selectedWithdrawal?.id ?? null}
              onRowClick={(row) => setSelectedWithdrawal(row as WithdrawalRow)}
            />
          </div>
          <PaginationControlsReference
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            rowsPerPageOptions={[20, 50, 100, 200]}
          />
        </div>
      </ListingPageContainer>

      <DetailsSidebar
        open={Boolean(selectedWithdrawal)}
        title="Withdrawal details"
        subtitle={selectedWithdrawal ? `Reference Number ${selectedWithdrawal.utr || "—"}` : undefined}
        onClose={() => setSelectedWithdrawal(null)}
        width="min(480px, 100vw)"
      >
        {selectedWithdrawal && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Summary</p>
                <TableStatusBadge status={selectedWithdrawal.status} />
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Trader</dt>
                  <dd className="text-right font-medium">{selectedWithdrawal.playerName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Payout settlement</dt>
                  <dd className="text-right font-medium">
                    {selectedWithdrawal.payoutSettlementType === "person" ? "Liability person" : "Company bank"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">
                    {selectedWithdrawal.payoutSettlementType === "person" ? "Liable person" : "Payout bank"}
                  </dt>
                  <dd className="max-w-[60%] text-right font-medium">
                    {selectedWithdrawal.payoutSettlementType === "person"
                      ? selectedWithdrawal.payoutLiabilityPersonName || "—"
                      : selectedWithdrawal.payoutBankName || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Amount / payable</dt>
                  <dd className="text-right font-medium">
                    {formatWholeMoney(selectedWithdrawal.amount)} /{" "}
                    {formatWholeMoney(selectedWithdrawal.payableAmount ?? 0)}
                  </dd>
                </div>
                {selectedWithdrawal.lastAmendedAt && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Last amended</dt>
                    <dd className="text-right text-xs">
                      {formatDateTimeForUser(selectedWithdrawal.lastAmendedAt)}
                      {selectedWithdrawal.lastAmendedByName ? ` · ${selectedWithdrawal.lastAmendedByName}` : ""}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {canAmend && selectedWithdrawal.status === "approved" && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                startIcon={<IconPencil className="size-4" />}
                onClick={() => openAmendDialog(selectedWithdrawal)}
              >
                Amend withdrawal
              </Button>
            )}
            {canDelete && (
              <Button
                type="button"
                variant="danger"
                className="w-full"
                startIcon={<IconTrash className="size-4" />}
                onClick={() => openDeleteDialog(selectedWithdrawal)}
              >
                Delete withdrawal
              </Button>
            )}

            <div className="rounded-lg border border-[var(--border)] bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <IconHistory className="size-4 text-[var(--brand-primary)]" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Amendment activity
                </p>
              </div>
              {historyRows.length === 0 ? (
                <p className="text-sm text-gray-500">No amendments yet.</p>
              ) : (
                <div className="max-h-64 overflow-auto [scrollbar-width:thin]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="py-1 pr-2 font-medium">When</th>
                        <th className="py-1 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((h, i) => (
                        <tr key={`${h.at}-${i}`} className="border-b border-gray-100 align-top">
                          <td className="py-2 pr-2 whitespace-nowrap text-gray-600">
                            {formatDateTimeForUser(h.at)}
                          </td>
                          <td className="py-2 text-gray-800">
                            <span className="line-clamp-3">{h.reason}</span>
                            <div className="mt-1 text-[10px] text-gray-500">
                              Payable {h.old.payableAmount != null ? formatWholeMoney(h.old.payableAmount) : "—"} →{" "}
                              {h.new.payableAmount != null ? formatWholeMoney(h.new.payableAmount) : "—"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DetailsSidebar>

      <Dialog open={amendOpen} title="Amend approved withdrawal" onClose={() => !amendLoading && setAmendOpen(false)}>
        <p className="mb-3 text-sm text-gray-600">
          {amendIsPersonPayout
            ? "Company bank balances are unchanged for liability-person payouts. The payable liability line may refresh when payable amount, Reference Number, or requested time change. Amendments are recorded in history and audit logs."
            : "Changes update settlement balances and are recorded in amendment history and audit logs."}
        </p>
        <FormGrid>
          <div>
            <FieldLabel>Amount</FieldLabel>
            <Input
              className="h-9"
              type="number"
              min={0}
              step="1"
              value={amendAmount}
              onChange={(e) => setAmendAmount(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Use 0 when the bank transaction was fully refunded.</p>
            <FieldError message={amendErrors.amount} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Requested date & time</FieldLabel>
            <Input
              className="h-9"
              type="datetime-local"
              value={amendRequestedAt}
              onChange={(e) => setAmendRequestedAt(e.target.value)}
            />
          </div>
          {amendIsPersonPayout ? (
            <div className="sm:col-span-2">
              <FieldLabel>Liable person (payout)</FieldLabel>
              <p className="rounded-md border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-gray-800">
                {selectedWithdrawal?.payoutLiabilityPersonName?.trim()
                  ? selectedWithdrawal.payoutLiabilityPersonName
                  : selectedWithdrawal?.payoutLiabilityPersonId || "—"}
              </p>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <FieldLabel>Payout bank</FieldLabel>
              <AutocompleteField
                value={amendPayoutBankId}
                onChange={(v) => setAmendPayoutBankId(v)}
                loadOptions={loadPayoutBankOptions}
                placeholder="Search bank…"
                defaultOption={amendPayoutBankDefault}
              />
              <FieldError message={amendErrors.payoutBankId} />
            </div>
          )}
          <div className="sm:col-span-2">
            <FieldLabel>Reference Number</FieldLabel>
            <Input className="h-9" value={amendUtr} onChange={(e) => setAmendUtr(e.target.value)} />
            <FieldError message={amendErrors.utr} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Reason (required)</FieldLabel>
            <AutocompleteField
              value={amendReasonId}
              onChange={(v) => setAmendReasonId(v)}
              loadOptions={loadAmendReasonOptions}
              placeholder="Select amendment reason…"
              defaultOption={amendReasonDefault}
            />
            <FieldError message={amendErrors.reason} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Remark (optional)</FieldLabel>
            <Textarea
              className="min-h-[88px] text-sm"
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              placeholder="Add additional context (optional)…"
            />
          </div>
        </FormGrid>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setAmendOpen(false)} disabled={amendLoading}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={() => void submitAmend()} disabled={amendLoading}>
            {amendLoading ? "Saving…" : "Save amendment"}
          </Button>
        </div>
      </Dialog>

      <Dialog open={deleteOpen} title="Delete withdrawal" onClose={() => !deleteLoading && setDeleteOpen(false)}>
        <p className="mb-3 text-sm text-gray-600">
          This will permanently delete the withdrawal and reverse impacted balances based on current status.
        </p>
        <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-gray-700">
          <div><span className="font-medium">Reference Number:</span> {selectedWithdrawal?.utr || "—"}</div>
          <div><span className="font-medium">Status:</span> {selectedWithdrawal?.status || "—"}</div>
          <div><span className="font-medium">Amount:</span> {selectedWithdrawal?.amount != null ? formatWholeMoney(selectedWithdrawal.amount) : "—"}</div>
          <div><span className="font-medium">Trader:</span> {selectedWithdrawal?.playerName || "—"}</div>
          <div>
            <span className="font-medium">Payout settlement:</span>{" "}
            {selectedWithdrawal?.payoutSettlementType === "person" ? "Liability person" : "Company bank"}
          </div>
          {selectedWithdrawal?.payoutSettlementType === "person" ? (
            <div>
              <span className="font-medium">Liable person:</span>{" "}
              {selectedWithdrawal?.payoutLiabilityPersonName || "—"}
            </div>
          ) : (
            <div>
              <span className="font-medium">Payout bank:</span> {selectedWithdrawal?.payoutBankName || "—"}
            </div>
          )}
          {selectedWithdrawal?.payoutSettlementType === "person" && selectedWithdrawal?.status === "approved" && (
            <p className="pt-1 text-xs text-gray-600">
              The liability ledger row tied to this withdrawal will be removed as part of the reversal.
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={() => void submitDelete()} disabled={deleteLoading}>
            {deleteLoading ? "Deleting..." : "Delete permanently"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

