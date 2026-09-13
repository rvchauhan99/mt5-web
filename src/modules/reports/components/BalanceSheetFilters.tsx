"use client";

import { useEffect, useState } from "react";
import { IconCalendar, IconFilter } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { listExchangeLookupOptions } from "@/services/lookupService";
import { reportService } from "@/services/reportService";
import { getApiErrorMessage } from "@/lib/apiError";
import type { BalanceSheetCompareMode, BalanceSheetGroupOption } from "@/types/balanceSheet";

export interface BalanceSheetFilterValues {
  fromDate: string;
  toDate: string;
  exchangeId: string;
  compare: BalanceSheetCompareMode;
  showZeroBalances: boolean;
  groupCode: string;
  search: string;
  showMovementColumns: boolean;
  compactDensity: boolean;
  summaryOnly: boolean;
}

interface BalanceSheetFiltersProps {
  values: BalanceSheetFilterValues;
  onChange: (next: BalanceSheetFilterValues) => void;
  onApply: () => void;
  onReset: () => void;
}

function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const BALANCE_SHEET_DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = toLocalYmd(new Date());
      return { fromDate: d, toDate: d };
    },
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        fromDate: toLocalYmd(new Date(n.getFullYear(), n.getMonth(), 1)),
        toDate: toLocalYmd(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
      };
    },
  },
  {
    label: "Last Month",
    fn: () => {
      const n = new Date();
      return {
        fromDate: toLocalYmd(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
        toDate: toLocalYmd(new Date(n.getFullYear(), n.getMonth(), 0)),
      };
    },
  },
  {
    label: "This Quarter",
    fn: () => {
      const n = new Date();
      const q = Math.floor(n.getMonth() / 3);
      return {
        fromDate: toLocalYmd(new Date(n.getFullYear(), q * 3, 1)),
        toDate: toLocalYmd(new Date(n.getFullYear(), q * 3 + 3, 0)),
      };
    },
  },
  {
    label: "Last Quarter",
    fn: () => {
      const n = new Date();
      const q = Math.floor(n.getMonth() / 3) - 1;
      const year = q < 0 ? n.getFullYear() - 1 : n.getFullYear();
      const qq = (q + 4) % 4;
      return {
        fromDate: toLocalYmd(new Date(year, qq * 3, 1)),
        toDate: toLocalYmd(new Date(year, qq * 3 + 3, 0)),
      };
    },
  },
  {
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        fromDate: toLocalYmd(new Date(n.getFullYear(), 0, 1)),
        toDate: toLocalYmd(new Date(n.getFullYear(), 11, 31)),
      };
    },
  },
  {
    label: "Last Year",
    fn: () => {
      const n = new Date();
      return {
        fromDate: toLocalYmd(new Date(n.getFullYear() - 1, 0, 1)),
        toDate: toLocalYmd(new Date(n.getFullYear() - 1, 11, 31)),
      };
    },
  },
];

export function BalanceSheetFilters({
  values,
  onChange,
  onApply,
  onReset,
}: BalanceSheetFiltersProps) {
  const [exchanges, setExchanges] = useState<Array<{ id: string; name: string }>>([]);
  const [groups, setGroups] = useState<BalanceSheetGroupOption[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const exRows = await listExchangeLookupOptions({ limit: 100 });
        if (!cancelled) {
          setExchanges(
            exRows.map((r) => ({
              id: String(r.id ?? ""),
              name: String(r.name ?? r.label ?? ""),
            })),
          );
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setExchanges([]);
          toast.error(getApiErrorMessage(error, "Failed to load exchanges"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const groupRows = await reportService.balanceSheetGroups();
        if (!cancelled) setGroups(groupRows);
      } catch (error: unknown) {
        if (!cancelled) {
          setGroups([]);
          toast.error(getApiErrorMessage(error, "Failed to load sheet sections"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePreset = (preset: (typeof BALANCE_SHEET_DATE_PRESETS)[0]) => {
    const dates = preset.fn();
    onChange({ ...values, ...dates });
    setActivePreset(preset.label);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <IconFilter size={12} aria-hidden />
        Filters
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
          <IconCalendar size={12} aria-hidden /> Quick Range
        </span>
        {BALANCE_SHEET_DATE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => handlePreset(p)}
            className={[
              "text-[11px] px-3 py-1 rounded-full border font-semibold transition-all shadow-sm",
              activePreset === p.label
                ? "bg-brand-primary text-white border-brand-primary"
                : "bg-white border-slate-200 text-slate-500 hover:border-brand-primary hover:text-brand-primary",
            ].join(" ")}
            aria-label={`Set date range to ${p.label}`}
            aria-pressed={activePreset === p.label}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          From
          <Input
            type="date"
            value={values.fromDate}
            onChange={(e) => {
              setActivePreset(null);
              onChange({ ...values, fromDate: e.target.value });
            }}
            className="h-9"
            aria-label="From date"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          To
          <Input
            type="date"
            value={values.toDate}
            onChange={(e) => {
              setActivePreset(null);
              onChange({ ...values, toDate: e.target.value });
            }}
            className="h-9"
            aria-label="To date"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Exchange
          <select
            value={values.exchangeId}
            onChange={(e) => onChange({ ...values, exchangeId: e.target.value })}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
            aria-label="Filter by exchange"
          >
            <option value="">All exchanges</option>
            {exchanges.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Sheet section
          <select
            value={values.groupCode}
            onChange={(e) => onChange({ ...values, groupCode: e.target.value })}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
            aria-label="Filter by balance sheet section"
            title="Filter to one Balance Sheet section (e.g. Bank Accounts, Expenses Payable)"
          >
            <option value="">All sections</option>
            {groups.map((g) => (
              <option key={g.groupId} value={g.code}>
                {"—".repeat(Math.max(0, g.level))} {g.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">
            Seeded BS sections (Assets / Liabilities / Equity)
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Compare
          <select
            value={values.compare}
            onChange={(e) =>
              onChange({ ...values, compare: e.target.value as BalanceSheetCompareMode })
            }
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
            aria-label="Compare period"
          >
            <option value="none">None</option>
            <option value="prior_period">Prior period</option>
            <option value="qoq">Quarter over quarter</option>
            <option value="yoy">Year over year</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Search ledgers
          <Input
            type="search"
            value={values.search}
            onChange={(e) => onChange({ ...values, search: e.target.value })}
            className="h-9"
            placeholder="Group or ledger name"
            aria-label="Search groups and ledgers"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.showZeroBalances}
            onChange={(e) => onChange({ ...values, showZeroBalances: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
            aria-label="Show zero balances"
          />
          Show zero balances
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.showMovementColumns}
            onChange={(e) => onChange({ ...values, showMovementColumns: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
            aria-label="Show opening debit credit columns"
          />
          Opening / Debit / Credit
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.compactDensity}
            onChange={(e) => onChange({ ...values, compactDensity: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
            aria-label="Compact density"
          />
          Compact
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.summaryOnly}
            onChange={(e) => onChange({ ...values, summaryOnly: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
            aria-label="Summary only"
          />
          Summary only
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={onApply} className="h-8 text-xs">
          Apply
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onReset} className="h-8 text-xs">
          Reset
        </Button>
      </div>
    </div>
  );
}

export { toLocalYmd };
