"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldError } from "@/components/common/FieldError";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FormActions, FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/apiError";
import { listBankLookupOptions, listPlayerLookupOptions } from "@/services/lookupService";
import { listLiabilityPersonsNormalized } from "@/services/liabilityService";
import {
  listReferralAccruals,
  settleReferralAccruals,
  updateReferralAccrual,
} from "@/services/referralService";
import type {
  ReferralAccrualRow,
  ReferralAccrualStatus,
  ReferralSettlementAccountType,
} from "@/types/referral";

function getPlayerLabel(
  raw: ReferralAccrualRow["referrerPlayerId"] | ReferralAccrualRow["referredPlayerId"],
): string {
  if (!raw) return "-";
  if (typeof raw === "string") return raw;
  return raw.phone ? `${raw.playerId ?? "-"} · ${raw.phone}` : raw.playerId ?? "-";
}

function getExchangeLabel(raw: ReferralAccrualRow["exchangeId"]): string {
  if (!raw) return "-";
  if (typeof raw === "string") return raw;
  return raw.provider ? `${raw.name ?? "-"} (${raw.provider})` : raw.name ?? "-";
}

function getDepositUtr(raw: ReferralAccrualRow["sourceDepositId"]): string {
  if (!raw) return "-";
  if (typeof raw === "string") return raw;
  return raw.utr ?? raw._id ?? "-";
}

function roundAccruedFromPercent(depositAmount: number, percentage: number): number {
  return Math.round((depositAmount * percentage) / 100);
}

function percentFromAccrued(depositAmount: number, accruedAmount: number): number {
  if (depositAmount <= 0) return 0;
  return Math.round((accruedAmount / depositAmount) * 10000) / 100;
}

type DraftValues = {
  percentage: string;
  amount: string;
};

export function ReferralSettlementClient() {
  const [status, setStatus] = useState<ReferralAccrualStatus | "">("accrued");
  const [referrerPlayerId, setReferrerPlayerId] = useState("");
  const [rows, setRows] = useState<ReferralAccrualRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [remark, setRemark] = useState("");
  const [settlementAccountType, setSettlementAccountType] =
    useState<ReferralSettlementAccountType>("bank");
  const [bankId, setBankId] = useState("");
  const [liabilityPersonId, setLiabilityPersonId] = useState("");
  const [settleErrors, setSettleErrors] = useState<{ bankId?: string; liabilityPersonId?: string }>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftValues>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadPlayerOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const players = await listPlayerLookupOptions({ q: query || undefined, limit: 25 });
      return players.map((p) => ({ value: p.id, label: `${p.playerId} · ${p.phone} · ${p.exchangeName}` }));
    } catch {
      return [];
    }
  }, []);

  const loadBankOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const bankRows = await listBankLookupOptions({ q: query || undefined, limit: 25 });
      return bankRows.map((b) => ({ value: b.id, label: b.label }));
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

  const buildDrafts = useCallback((nextRows: ReferralAccrualRow[]) => {
    const next: Record<string, DraftValues> = {};
    for (const row of nextRows) {
      const id = String(row._id);
      next[id] = {
        percentage: String(row.referralPercentage ?? 0),
        amount: String(row.accruedAmount ?? 0),
      };
    }
    return next;
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listReferralAccruals({
        page: 1,
        pageSize: 200,
        status: (status || undefined) as ReferralAccrualStatus | undefined,
        referrerPlayerId: referrerPlayerId || undefined,
      });
      setRows(result.data);
      setDrafts(buildDrafts(result.data));
      setSelectedIds([]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to load referral accruals"));
    } finally {
      setLoading(false);
    }
  }, [buildDrafts, referrerPlayerId, status]);

  const selectableRows = useMemo(
    () => rows.filter((row) => row.status === "accrued").map((row) => String(row._id)),
    [rows],
  );

  const selectedTotal = useMemo(
    () =>
      rows
        .filter((row) => selectedIds.includes(String(row._id)))
        .reduce((sum, row) => sum + Number(row.accruedAmount ?? 0), 0),
    [rows, selectedIds],
  );

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, id]));
      return prev.filter((x) => x !== id);
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? selectableRows : []);
  };

  const handlePercentageChange = (row: ReferralAccrualRow, value: string) => {
    const id = String(row._id);
    const deposit = Number(row.sourceDepositAmount ?? 0);
    const pct = Number(value);
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        percentage: value,
        amount:
          value.trim() === "" || Number.isNaN(pct)
            ? prev[id]?.amount ?? String(row.accruedAmount ?? 0)
            : String(roundAccruedFromPercent(deposit, pct)),
      },
    }));
  };

  const handleAmountChange = (row: ReferralAccrualRow, value: string) => {
    const id = String(row._id);
    const deposit = Number(row.sourceDepositAmount ?? 0);
    const amt = Number(value);
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        amount: value,
        percentage:
          value.trim() === "" || Number.isNaN(amt) || deposit <= 0
            ? prev[id]?.percentage ?? String(row.referralPercentage ?? 0)
            : String(percentFromAccrued(deposit, amt)),
      },
    }));
  };

  const isDraftDirty = (row: ReferralAccrualRow): boolean => {
    const id = String(row._id);
    const draft = drafts[id];
    if (!draft) return false;
    const pct = Number(draft.percentage);
    const amt = Number(draft.amount);
    return Number(row.referralPercentage ?? 0) !== pct || Number(row.accruedAmount ?? 0) !== amt;
  };

  const onSaveAccrual = async (row: ReferralAccrualRow) => {
    const id = String(row._id);
    const draft = drafts[id];
    if (!draft) return;

    const originalPct = Number(row.referralPercentage ?? 0);
    const originalAmt = Number(row.accruedAmount ?? 0);
    const pct = Number(draft.percentage);
    const amt = Number(draft.amount);

    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Referral % must be between 0 and 100.");
      return;
    }
    if (Number.isNaN(amt) || amt < 0 || !Number.isInteger(amt)) {
      toast.error("Accrued amount must be a whole number ≥ 0.");
      return;
    }

    const pctChanged = pct !== originalPct;
    const amtChanged = amt !== originalAmt;
    if (!pctChanged && !amtChanged) return;

    setSavingId(id);
    try {
      // Prefer the field the user last meaningfully changed; if both differ, send amount when % was derived from it.
      const payload =
        pctChanged && !amtChanged
          ? { referralPercentage: pct }
          : amtChanged && !pctChanged
            ? { accruedAmount: amt }
            : Math.abs(roundAccruedFromPercent(Number(row.sourceDepositAmount ?? 0), pct) - amt) === 0
              ? { referralPercentage: pct }
              : { accruedAmount: amt };

      const updated = await updateReferralAccrual(id, payload);
      setRows((prev) => prev.map((r) => (String(r._id) === id ? { ...r, ...updated } : r)));
      setDrafts((prev) => ({
        ...prev,
        [id]: {
          percentage: String(updated.referralPercentage ?? 0),
          amount: String(updated.accruedAmount ?? 0),
        },
      }));
      toast.success("Accrual updated.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update accrual"));
    } finally {
      setSavingId(null);
    }
  };

  const onSettle = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one accrued referral row to settle.");
      return;
    }
    const nextErrors: { bankId?: string; liabilityPersonId?: string } = {};
    if (settlementAccountType === "bank" && !bankId.trim()) {
      nextErrors.bankId = "Select a bank to debit.";
    }
    if (settlementAccountType === "person" && !liabilityPersonId.trim()) {
      nextErrors.liabilityPersonId = "Select a liability person.";
    }
    setSettleErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSettling(true);
    try {
      const result =
        settlementAccountType === "bank"
          ? await settleReferralAccruals({
              accrualIds: selectedIds,
              remark: remark.trim() || undefined,
              settlementAccountType: "bank",
              bankId: bankId.trim(),
            })
          : await settleReferralAccruals({
              accrualIds: selectedIds,
              remark: remark.trim() || undefined,
              settlementAccountType: "person",
              liabilityPersonId: liabilityPersonId.trim(),
            });
      toast.success(
        `Settlement posted: ${result.settledAccrualCount} rows, total ${result.totalAmount.toLocaleString()}.`,
      );
      setRemark("");
      setSettleErrors({});
      await runSearch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to settle referral accruals"));
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <FormContainer
        title="IB Referral Settlement"
        description="Review IB referral accruals and settle by debiting a bank or liability person (same funding pattern as expenses)."
      >
        <FormGrid className="md:grid-cols-3">
          <div>
            <FieldLabel>Status</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus((e.target.value || "") as ReferralAccrualStatus | "")}
            >
              <option value="">All</option>
              <option value="accrued">Accrued</option>
              <option value="settled">Settled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <FieldLabel>Referrer Trader</FieldLabel>
            <AutocompleteField
              value={referrerPlayerId}
              onChange={setReferrerPlayerId}
              loadOptions={loadPlayerOptions}
              autoSelectSingleOption
              placeholder="search referrer..."
            />
          </div>
          <div>
            <FieldLabel>Settlement Remark</FieldLabel>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Optional remark" />
          </div>
          <div>
            <FieldLabel>Settlement account type *</FieldLabel>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={settlementAccountType}
              onChange={(e) => {
                const v = e.target.value === "person" ? "person" : "bank";
                setSettlementAccountType(v);
                setSettleErrors({});
              }}
              aria-label="Settlement account type"
            >
              <option value="bank">Bank</option>
              <option value="person">Liability person</option>
            </select>
          </div>
          {settlementAccountType === "bank" ? (
            <div>
              <FieldLabel>Bank account to debit *</FieldLabel>
              <AutocompleteField
                value={bankId}
                onChange={setBankId}
                loadOptions={loadBankOptions}
                placeholder="Select bank…"
              />
              <FieldError message={settleErrors.bankId} />
            </div>
          ) : (
            <div>
              <FieldLabel>Liability person *</FieldLabel>
              <AutocompleteField
                value={liabilityPersonId}
                onChange={setLiabilityPersonId}
                loadOptions={loadLiabilityPersonOptions}
                placeholder="Select liability person…"
              />
              <FieldError message={settleErrors.liabilityPersonId} />
            </div>
          )}
        </FormGrid>
        <FormActions className="justify-between">
          <Button type="button" onClick={() => void runSearch()} loading={loading}>
            Search
          </Button>
          <Button type="button" onClick={() => void onSettle()} loading={settling} disabled={selectedIds.length === 0}>
            Settle Selected
          </Button>
        </FormActions>
      </FormContainer>

      <FormContainer
        title="Accrual Rows"
        description="Only accrued rows are selectable for settlement. Edit Referral % or Accrued Amt before settling; the other updates automatically."
      >
        <div className="mb-3 flex items-center justify-between text-sm">
          <Checkbox
            label="Select all accrued rows"
            checked={selectableRows.length > 0 && selectedIds.length === selectableRows.length}
            onChange={(e) => toggleSelectAll(e.target.checked)}
          />
          <span className="font-medium">Selected total: {selectedTotal.toLocaleString()}</span>
        </div>
        <div className="max-h-[520px] overflow-auto rounded-md border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-[var(--surface-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Pick</th>
                <th className="px-3 py-2 text-left">Referrer</th>
                <th className="px-3 py-2 text-left">Referred</th>
                <th className="px-3 py-2 text-left">Exchange</th>
                <th className="px-3 py-2 text-left">Source Reference Number</th>
                <th className="px-3 py-2 text-right">Deposit Amt</th>
                <th className="px-3 py-2 text-right">Referral %</th>
                <th className="px-3 py-2 text-right">Accrued Amt</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-white">
              {rows.map((row) => {
                const id = String(row._id);
                const isAccrued = row.status === "accrued";
                const draft = drafts[id] ?? {
                  percentage: String(row.referralPercentage ?? 0),
                  amount: String(row.accruedAmount ?? 0),
                };
                const dirty = isAccrued && isDraftDirty(row);
                return (
                  <tr key={id}>
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedIds.includes(id)}
                        onChange={(e) => toggleSelection(id, e.target.checked)}
                        disabled={!isAccrued}
                      />
                    </td>
                    <td className="px-3 py-2">{getPlayerLabel(row.referrerPlayerId)}</td>
                    <td className="px-3 py-2">{getPlayerLabel(row.referredPlayerId)}</td>
                    <td className="px-3 py-2">{getExchangeLabel(row.exchangeId)}</td>
                    <td className="px-3 py-2">{getDepositUtr(row.sourceDepositId)}</td>
                    <td className="px-3 py-2 text-right">{Number(row.sourceDepositAmount ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      {isAccrued ? (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          className="h-8 w-24 text-right"
                          value={draft.percentage}
                          onChange={(e) => handlePercentageChange(row, e.target.value)}
                          aria-label={`Referral percentage for ${id}`}
                          disabled={savingId === id}
                        />
                      ) : (
                        Number(row.referralPercentage ?? 0).toLocaleString()
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isAccrued ? (
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          className="h-8 w-28 text-right"
                          value={draft.amount}
                          onChange={(e) => handleAmountChange(row, e.target.value)}
                          aria-label={`Accrued amount for ${id}`}
                          disabled={savingId === id}
                        />
                      ) : (
                        Number(row.accruedAmount ?? 0).toLocaleString()
                      )}
                    </td>
                    <td className="px-3 py-2 capitalize">{row.status}</td>
                    <td className="px-3 py-2">
                      {isAccrued ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="secondary"
                          disabled={!dirty || savingId === id}
                          loading={savingId === id}
                          onClick={() => void onSaveAccrual(row)}
                        >
                          Save
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-center text-[var(--text-secondary)]" colSpan={10}>
                    No accrual rows found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </FormContainer>
    </div>
  );
}
