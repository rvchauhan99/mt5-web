"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
  type KeyboardEvent,
} from "react";
import {
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import DateFieldReference from "@/components/common/DateFieldReference";

type DateFieldChangeEvent = { target: { name?: string; value: string } };
const DateField = DateFieldReference as ComponentType<{
  name: string;
  label?: string;
  value: string;
  onChange: (e: DateFieldChangeEvent) => void;
}>;

import { AutocompleteField } from "@/components/common/AutocompleteField";
import { listBanksNormalized } from "@/services/bankService";
import { listPlayersNormalized } from "@/services/playerService";
import { userService } from "@/services/userService";
import type { BankRow } from "@/types/bank";
import type { PlayerRow } from "@/types/player";
import {
  WITHDRAWAL_FINAL_FILTER_KEYS,
  emptyWithdrawalFinalFilters,
  type WithdrawalFinalFilterKey,
} from "@/modules/withdrawal/withdrawalFinalListConstants";
import {
  buildAmountApiParams,
  buildCreatedAtApiParams,
  buildPayableAmountApiParams,
  displayNumericRangePair,
  fixedTextOperatorsForApply,
} from "@/modules/withdrawal/withdrawalFinalListFilterMapping";

const STATUS_OPTIONS = [
  { label: "Requested", value: "requested" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Finalized", value: "finalized" },
];

const HAS_AMENDMENT_OPTIONS = [
  { label: "Has amendments", value: "yes" },
  { label: "No amendments", value: "no" },
];

const CHIP_LABELS: Partial<Record<WithdrawalFinalFilterKey | "q", string>> = {
  q: "Search",
  utr: "UTR",
  bankName: "Bank name",
  playerName: "Player name",
  status: "Status",
  hasAmendment: "Amendments",
  amount: "Requested",
  payableAmount: "Payable",
  createdBy: "Created by",
  approvedBy: "Approved by",
  createdAt_from: "Transaction date",
};

/** Keys counted once for chips / count (skip bound fields counted with parent). */
const SKIP_CHIP_KEYS = new Set<WithdrawalFinalFilterKey>([
  "amount_to",
  "payableAmount_to",
  "createdAt_to",
  "utr_op",
  "bankName_op",
  "playerName_op",
  "amount_op",
  "payableAmount_op",
  "createdAt_op",
]);

type ExchangeUserRow = {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
  name?: string;
};

function buildUserLabel(row: ExchangeUserRow): string {
  const fullName = row.fullName?.trim();
  const username = row.username?.trim();
  const name = row.name?.trim();
  if (fullName && username) return `${fullName} (${username})`;
  if (fullName) return fullName;
  if (username) return username;
  return name || "";
}

function bankLabel(b: BankRow): string {
  const last4 =
    b.accountNumber.length >= 4 ? b.accountNumber.slice(-4) : b.accountNumber;
  return `${b.holderName} - ${b.bankName} - ${last4}`.trim();
}

const DEBOUNCE_Q_MS = 450;

type Props = {
  q: string;
  filters: Record<string, string>;
  setQ: (value: string, debounce?: boolean) => void;
  setFilters: (next: Record<string, string>, resetPage?: boolean, debounce?: boolean) => void;
  onClear: () => void;
  defaultOpen?: boolean;
};

export function WithdrawalFinalListFilterPanel({
  q,
  filters,
  setQ,
  setFilters,
  onClear,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [local, setLocal] = useState(() => ({ ...emptyWithdrawalFinalFilters(), ...filters }));
  const [quickSearch, setQuickSearch] = useState(q);
  const debounceQRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const am = displayNumericRangePair(filters.amount, filters.amount_to, filters.amount_op);
    const pm = displayNumericRangePair(
      filters.payableAmount,
      filters.payableAmount_to,
      filters.payableAmount_op,
    );
    setLocal({
      ...emptyWithdrawalFinalFilters(),
      ...filters,
      amount: am.from,
      amount_to: am.to,
      payableAmount: pm.from,
      payableAmount_to: pm.to,
    });
  }, [filters]);

  useEffect(() => {
    setQuickSearch(q);
  }, [q]);

  useEffect(() => {
    return () => {
      if (debounceQRef.current) clearTimeout(debounceQRef.current);
    };
  }, []);

  const handleQuickSearchChange = useCallback(
    (val: string) => {
      setQuickSearch(val);
      if (debounceQRef.current) clearTimeout(debounceQRef.current);
      debounceQRef.current = setTimeout(() => {
        setQ(val, true);
      }, DEBOUNCE_Q_MS);
    },
    [setQ],
  );

  const handleChange = useCallback((key: WithdrawalFinalFilterKey, value: string) => {
    setLocal((prev) => ({ ...prev, [key]: value ?? "" }));
  }, []);

  const loadUserOptions = useCallback(async (query: string) => {
    try {
      const response = await userService.list({
        q: query || undefined,
        page: 1,
        limit: 20,
        sortBy: "fullName",
        sortOrder: "asc",
      });
      const rows = Array.isArray(response?.data) ? (response.data as ExchangeUserRow[]) : [];
      return rows
        .map((row) => {
          const value = String(row._id ?? row.id ?? "").trim();
          const label = buildUserLabel(row);
          if (!value || !label) return null;
          return { value, label };
        })
        .filter((row): row is { value: string; label: string } => row !== null);
    } catch {
      return [];
    }
  }, []);

  const handleApply = useCallback(() => {
    if (debounceQRef.current) clearTimeout(debounceQRef.current);
    debounceQRef.current = null;
    const textOps = fixedTextOperatorsForApply(local.utr, local.bankName, local.playerName);
    const next = {
      ...emptyWithdrawalFinalFilters(),
      utr: local.utr,
      bankName: local.bankName,
      playerName: local.playerName,
      ...textOps,
      status: local.status,
      hasAmendment: local.hasAmendment,
      ...buildAmountApiParams(local.amount, local.amount_to),
      ...buildPayableAmountApiParams(local.payableAmount, local.payableAmount_to),
      createdBy: local.createdBy,
      approvedBy: local.approvedBy,
      ...buildCreatedAtApiParams(local.createdAt_from, local.createdAt_to),
      q: quickSearch,
    };
    setFilters(next, true, false);
    setOpen(false);
  }, [local, quickSearch, setFilters]);

  const handleClear = useCallback(() => {
    if (debounceQRef.current) clearTimeout(debounceQRef.current);
    debounceQRef.current = null;
    setLocal(emptyWithdrawalFinalFilters());
    setQuickSearch("");
    onClear();
    setOpen(false);
  }, [onClear]);

  const activeCount = useMemo(() => {
    let n = quickSearch.trim() ? 1 : 0;
    for (const key of WITHDRAWAL_FINAL_FILTER_KEYS) {
      if (SKIP_CHIP_KEYS.has(key)) continue;
      if (key === "amount") {
        if (local.amount?.trim() || local.amount_to?.trim()) n += 1;
        continue;
      }
      if (key === "payableAmount") {
        if (local.payableAmount?.trim() || local.payableAmount_to?.trim()) n += 1;
        continue;
      }
      if (key === "createdAt_from") {
        if (local.createdAt_from?.trim() || local.createdAt_to?.trim()) n += 1;
        continue;
      }
      const v = local[key]?.trim();
      if (!v) continue;
      n += 1;
    }
    return n;
  }, [local, quickSearch]);

  const chipLabels = useMemo(() => {
    const labels: string[] = [];
    if (quickSearch.trim()) labels.push("Search");
    for (const key of WITHDRAWAL_FINAL_FILTER_KEYS) {
      if (SKIP_CHIP_KEYS.has(key)) continue;
      if (key === "amount") {
        if (local.amount?.trim() || local.amount_to?.trim()) labels.push("Requested");
        continue;
      }
      if (key === "payableAmount") {
        if (local.payableAmount?.trim() || local.payableAmount_to?.trim()) labels.push("Payable");
        continue;
      }
      if (key === "createdAt_from") {
        if (local.createdAt_from?.trim() || local.createdAt_to?.trim()) labels.push("Transaction date");
        continue;
      }
      const v = local[key]?.trim();
      if (!v) continue;
      const base = CHIP_LABELS[key] ?? key;
      labels.push(base);
    }
    return labels;
  }, [local, quickSearch]);

  return (
    <div className="border-0 bg-transparent p-0 shadow-none">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(!open)}
          className="flex shrink-0 items-center h-9"
          startIcon={<IconFilter size={16} stroke={1.5} />}
          endIcon={open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-tight">
            Advanced filters
            {activeCount > 0 && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {activeCount}
              </span>
            )}
          </span>
        </Button>

        <div className="no-scrollbar flex min-h-9 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
          {chipLabels.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-tight text-emerald-800"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="relative w-full shrink-0 sm:w-80">
          <IconSearch
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            type="text"
            placeholder="Quick search (UTR, player name)"
            className="h-10 border-[var(--border)] pl-9 pr-8 text-sm"
            value={quickSearch}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleQuickSearchChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                if (debounceQRef.current) clearTimeout(debounceQRef.current);
                setQ(quickSearch, false);
              }
            }}
          />
          {quickSearch ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600"
              onClick={() => handleQuickSearchChange("")}
              aria-label="Clear search"
            >
              <IconX size={14} />
            </Button>
          ) : null}
        </div>
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">UTR (contains)</Label>
            <Input
              className="h-9 w-full text-sm"
              placeholder="UTR reference"
              value={local.utr}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("utr", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Bank name (contains)</Label>
            <Input
              className="h-9 w-full text-sm"
              placeholder="Bank label"
              value={local.bankName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("bankName", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Player name (contains)</Label>
            <Input
              className="h-9 w-full text-sm"
              placeholder="Player name"
              value={local.playerName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("playerName", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Status</Label>
            <Select
              value={local.status || "__all__"}
              onValueChange={(v: string) => handleChange("status", v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="">
                <SelectItem value="__all__" className="text-sm">
                  All
                </SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Amendments</Label>
            <Select
              value={local.hasAmendment || "__all__"}
              onValueChange={(v: string) => handleChange("hasAmendment", v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="">
                <SelectItem value="__all__" className="text-sm">
                  All
                </SelectItem>
                {HAS_AMENDMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Requested amount (from / to)</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                type="text"
                inputMode="decimal"
                className="h-9 min-w-[100px] flex-1 text-sm"
                placeholder="From"
                value={local.amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("amount", e.target.value)}
              />
              <Input
                type="text"
                inputMode="decimal"
                className="h-9 min-w-[100px] flex-1 text-sm"
                placeholder="To"
                value={local.amount_to}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange("amount_to", e.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Payable amount (from / to)</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                type="text"
                inputMode="decimal"
                className="h-9 min-w-[100px] flex-1 text-sm"
                placeholder="From"
                value={local.payableAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange("payableAmount", e.target.value)
                }
              />
              <Input
                type="text"
                inputMode="decimal"
                className="h-9 min-w-[100px] flex-1 text-sm"
                placeholder="To"
                value={local.payableAmount_to}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange("payableAmount_to", e.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Created by</Label>
            <AutocompleteField
              value={local.createdBy}
              onChange={(v) => handleChange("createdBy", v)}
              loadOptions={loadUserOptions}
              placeholder="Search user…"
              emptyText="No users found"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Approved by</Label>
            <AutocompleteField
              value={local.approvedBy}
              onChange={(v) => handleChange("approvedBy", v)}
              loadOptions={loadUserOptions}
              placeholder="Search user…"
              emptyText="No users found"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <Label className="text-xs text-slate-600">Transaction date (from / to)</Label>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] max-w-[220px] flex-1">
                <DateField
                  name="createdAt_from"
                  label=""
                  value={local.createdAt_from}
                  onChange={(e: DateFieldChangeEvent) => handleChange("createdAt_from", e.target.value)}
                />
              </div>
              <div className="min-w-[140px] max-w-[220px] flex-1">
                <DateField
                  name="createdAt_to"
                  label=""
                  value={local.createdAt_to}
                  onChange={(e: DateFieldChangeEvent) => handleChange("createdAt_to", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="col-span-1 flex items-end justify-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClear}
              startIcon={<IconX size={14} />}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              startIcon={<IconFilter size={14} />}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
