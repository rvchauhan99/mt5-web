"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FormActions, FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/apiError";
import { listPlayerLookupOptions } from "@/services/lookupService";
import { listReferralAccruals, settleReferralAccruals } from "@/services/referralService";
import type { ReferralAccrualRow, ReferralAccrualStatus } from "@/types/referral";

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

export function ReferralSettlementClient() {
  const [status, setStatus] = useState<ReferralAccrualStatus | "">("accrued");
  const [referrerPlayerId, setReferrerPlayerId] = useState("");
  const [rows, setRows] = useState<ReferralAccrualRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [remark, setRemark] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadPlayerOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const players = await listPlayerLookupOptions({ q: query || undefined, limit: 25 });
      return players.map((p) => ({ value: p.id, label: `${p.playerId} · ${p.phone} · ${p.exchangeName}` }));
    } catch {
      return [];
    }
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
      setSelectedIds([]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to load referral accruals"));
    } finally {
      setLoading(false);
    }
  }, [referrerPlayerId, status]);

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

  const onSettle = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one accrued referral row to settle.");
      return;
    }
    setSettling(true);
    try {
      const result = await settleReferralAccruals({ accrualIds: selectedIds, remark: remark.trim() || undefined });
      toast.success(
        `Settlement posted: ${result.settledAccrualCount} rows, total ${result.totalAmount.toLocaleString()}.`,
      );
      setRemark("");
      await runSearch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to settle referral accruals"));
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <FormContainer title="Referral Settlement" description="Review referral accruals and settle manually as bonus deposit entries (without bank impact).">
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
            <FieldLabel>Referrer Player</FieldLabel>
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

      <FormContainer title="Accrual Rows" description="Only accrued rows are selectable for settlement.">
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
                <th className="px-3 py-2 text-left">Source UTR</th>
                <th className="px-3 py-2 text-right">Deposit Amt</th>
                <th className="px-3 py-2 text-right">Referral %</th>
                <th className="px-3 py-2 text-right">Accrued Amt</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-white">
              {rows.map((row) => {
                const id = String(row._id);
                const isAccrued = row.status === "accrued";
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
                    <td className="px-3 py-2 text-right">{Number(row.referralPercentage ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(row.accruedAmount ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 capitalize">{row.status}</td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-center text-[var(--text-secondary)]" colSpan={9}>
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
