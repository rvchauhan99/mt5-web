"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconFilter,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/common/FieldLabel";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import { DATE_PRESETS } from "@/modules/dashboard/components/DashboardFilterBar";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { cn } from "@/lib/cn";
import { listLiabilityPersonsNormalized } from "@/services/liabilityService";
import { listBankLookupOptions } from "@/services/lookupService";

export const LIABILITY_ENTRY_FILTER_KEYS = [
  "entryType",
  "sourceType",
  "personId",
  "personLabel",
  "bankId",
  "bankLabel",
  "entryDate_from",
  "entryDate_to",
  "amount_from",
  "amount_to",
  "operatedCurrency",
] as const;

export type LiabilityEntryFilterKey = (typeof LIABILITY_ENTRY_FILTER_KEYS)[number];

const ENTRY_TYPE_OPTIONS = [
  { value: "receipt", label: "Receipt" },
  { value: "payment", label: "Payment" },
  { value: "contra", label: "Contra" },
  { value: "journal", label: "Journal" },
];

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "expense", label: "Expense" },
  { value: "referral", label: "Referral" },
];

const DATE_PRESET_LABELS = ["Today", "This Week", "This Month", "Last 30D"] as const;

const DEBOUNCE_Q_MS = 450;

type Props = {
  q: string;
  filters: Record<string, string>;
  setQ: (value: string, debounce?: boolean) => void;
  setFilters: (next: Record<string, string>, resetPage?: boolean, debounce?: boolean) => void;
  onClear: () => void;
  defaultOpen?: boolean;
  exportButtonLabel?: string;
  onExportClick?: () => void;
  exportDisabled?: boolean;
  onPrintClick?: () => void;
};

export function LiabilityEntryFilterPanel({
  q,
  filters,
  setQ,
  setFilters,
  onClear,
  defaultOpen = false,
  exportButtonLabel = "Export",
  onExportClick,
  exportDisabled = false,
  onPrintClick,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [quickSearch, setQuickSearch] = useState(q);
  const [local, setLocal] = useState<Record<string, string>>(() => ({ ...filters }));
  const debounceQRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);

  useEffect(() => {
    setQuickSearch(q);
  }, [q]);

  useEffect(() => {
    setLocal({ ...filters });
    if (!filters.entryDate_from && !filters.entryDate_to) setActiveDatePreset("All time");
  }, [filters]);

  useEffect(
    () => () => {
      if (debounceQRef.current) clearTimeout(debounceQRef.current);
    },
    [],
  );

  const handleQuickSearchChange = useCallback(
    (value: string) => {
      setQuickSearch(value);
      if (debounceQRef.current) clearTimeout(debounceQRef.current);
      debounceQRef.current = setTimeout(() => setQ(value, false), DEBOUNCE_Q_MS);
    },
    [setQ],
  );

  const patchLocal = useCallback((patch: Record<string, string>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyFilters = useCallback(() => {
    const next: Record<string, string> = {};
    for (const key of LIABILITY_ENTRY_FILTER_KEYS) {
      next[key] = (local[key] ?? "").trim();
    }
    setFilters(next, true, false);
  }, [local, setFilters]);

  const handleClear = useCallback(() => {
    setQuickSearch("");
    setActiveDatePreset("All time");
    const empty: Record<string, string> = {};
    for (const key of LIABILITY_ENTRY_FILTER_KEYS) empty[key] = "";
    setLocal(empty);
    setQ("", false);
    onClear();
  }, [onClear, setQ]);

  const handleDatePreset = useCallback((label: string) => {
    if (label === "All time") {
      setActiveDatePreset("All time");
      patchLocal({ entryDate_from: "", entryDate_to: "" });
      return;
    }
    const preset = DATE_PRESETS.find((p) => p.label === label);
    if (!preset) return;
    const dates = preset.fn();
    setActiveDatePreset(label);
    patchLocal({ entryDate_from: dates.date_from, entryDate_to: dates.date_to });
  }, [patchLocal]);

  const loadPersonOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    const res = await listLiabilityPersonsNormalized({
      page: 1,
      limit: 30,
      q: query,
      sortBy: "name",
      sortOrder: "asc",
    });
    return res.data.map((p) => ({ value: p.id, label: p.name }));
  }, []);

  const loadBankOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    const rows = await listBankLookupOptions({ q: query || undefined, limit: 30 });
    return rows.map((b) => ({ value: b.id, label: b.label }));
  }, []);

  const personDefault = useMemo<AutocompleteOption | null>(() => {
    if (!local.personId) return null;
    return { value: local.personId, label: local.personLabel || local.personId };
  }, [local.personId, local.personLabel]);

  const bankDefault = useMemo<AutocompleteOption | null>(() => {
    if (!local.bankId) return null;
    return { value: local.bankId, label: local.bankLabel || local.bankId };
  }, [local.bankId, local.bankLabel]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (quickSearch.trim()) n += 1;
    if (local.entryType?.trim()) n += 1;
    if (local.sourceType?.trim()) n += 1;
    if (local.personId?.trim()) n += 1;
    if (local.bankId?.trim()) n += 1;
    if (local.entryDate_from?.trim() || local.entryDate_to?.trim()) n += 1;
    if (local.amount_from?.trim() || local.amount_to?.trim()) n += 1;
    if (local.operatedCurrency?.trim()) n += 1;
    return n;
  }, [local, quickSearch]);

  const chipLabels = useMemo(() => {
    const labels: string[] = [];
    if (quickSearch.trim()) labels.push("Search");
    if (local.entryType?.trim()) labels.push("Type");
    if (local.sourceType?.trim()) labels.push("Source");
    if (local.personId?.trim()) labels.push("Person");
    if (local.bankId?.trim()) labels.push("Bank");
    if (local.entryDate_from?.trim() || local.entryDate_to?.trim()) labels.push("Date");
    if (local.amount_from?.trim() || local.amount_to?.trim()) labels.push("Amount");
    if (local.operatedCurrency?.trim()) labels.push("Currency");
    return labels;
  }, [local, quickSearch]);

  return (
    <div className="mb-3 border-0 bg-transparent p-0 shadow-none">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(!open)}
          className="flex h-9 shrink-0 items-center"
          startIcon={<IconFilter size={16} stroke={1.5} />}
          endIcon={open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-tight">
            Filters
            {activeCount > 0 ? (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {activeCount}
              </span>
            ) : null}
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

        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <IconSearch
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            type="text"
            placeholder="Search reference or remark..."
            className="h-9 border-[var(--border)] pl-9 pr-8 text-sm"
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

        {onExportClick ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 shrink-0"
                disabled={exportDisabled}
                startIcon={<IconDownload size={16} stroke={1.5} />}
              >
                {exportButtonLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="" inset={false}>
                Choose Format
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExportClick} className="cursor-pointer">
                <IconFileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                <span>Excel (.xlsx)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onPrintClick || (() => window.print())}
                className="cursor-pointer"
              >
                <IconFileText className="mr-2 h-4 w-4 text-rose-600" />
                <span>PDF Report (.pdf)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Date range
            </span>
            <Button
              type="button"
              size="xs"
              variant={activeDatePreset === "All time" ? "primary" : "secondary"}
              className={cn(
                "h-6 rounded-full px-2.5 text-[10px] font-semibold",
                activeDatePreset !== "All time" && "border-slate-200 bg-white",
              )}
              onClick={() => handleDatePreset("All time")}
            >
              All time
            </Button>
            {DATE_PRESETS.filter((p) =>
              (DATE_PRESET_LABELS as readonly string[]).includes(p.label),
            ).map((p) => (
              <Button
                key={p.label}
                type="button"
                size="xs"
                variant={activeDatePreset === p.label ? "primary" : "secondary"}
                className={cn(
                  "h-6 rounded-full px-2.5 text-[10px] font-semibold",
                  activeDatePreset !== p.label && "border-slate-200 bg-white",
                )}
                onClick={() => handleDatePreset(p.label)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <FieldLabel>Entry type</FieldLabel>
              <select
                className="h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm"
                value={local.entryType || ""}
                onChange={(e) => patchLocal({ entryType: e.target.value })}
              >
                <option value="">All types</option>
                {ENTRY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <FieldLabel>Source</FieldLabel>
              <select
                className="h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm"
                value={local.sourceType || ""}
                onChange={(e) => patchLocal({ sourceType: e.target.value })}
              >
                <option value="">All sources</option>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <FieldLabel>Person</FieldLabel>
              <AutocompleteField
                value={local.personId || ""}
                onChange={(id) => patchLocal({ personId: id, personLabel: "" })}
                loadOptions={loadPersonOptions}
                defaultOption={personDefault}
                placeholder="Any person"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Bank</FieldLabel>
              <AutocompleteField
                value={local.bankId || ""}
                onChange={(id) => patchLocal({ bankId: id, bankLabel: "" })}
                loadOptions={loadBankOptions}
                defaultOption={bankDefault}
                placeholder="Any bank"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Date from</FieldLabel>
              <Input
                type="date"
                className="h-10 bg-white"
                value={local.entryDate_from || ""}
                onChange={(e) => {
                  setActiveDatePreset(null);
                  patchLocal({ entryDate_from: e.target.value });
                }}
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Date to</FieldLabel>
              <Input
                type="date"
                className="h-10 bg-white"
                value={local.entryDate_to || ""}
                onChange={(e) => {
                  setActiveDatePreset(null);
                  patchLocal({ entryDate_to: e.target.value });
                }}
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Amount from</FieldLabel>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-10 bg-white"
                placeholder="Min"
                value={local.amount_from || ""}
                onChange={(e) => patchLocal({ amount_from: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Amount to</FieldLabel>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-10 bg-white"
                placeholder="Max"
                value={local.amount_to || ""}
                onChange={(e) => patchLocal({ amount_to: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Operated currency</FieldLabel>
              <select
                className="h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm"
                value={local.operatedCurrency || ""}
                onChange={(e) => patchLocal({ operatedCurrency: e.target.value })}
              >
                <option value="">All currencies</option>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              Apply filters
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={handleClear}>
              Clear all
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
