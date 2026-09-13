"use client";

import { useEffect, useState } from "react";
import { IconCalendar, IconFilter } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { listExchangeLookupOptions } from "@/services/lookupService";
import type { BalanceSheetCompareMode } from "@/types/balanceSheet";

export interface BalanceSheetFilterValues {
  fromDate: string;
  toDate: string;
  exchangeId: string;
  compare: BalanceSheetCompareMode;
  showZeroBalances: boolean;
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
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        fromDate: toLocalYmd(new Date(n.getFullYear(), 0, 1)),
        toDate: toLocalYmd(new Date(n.getFullYear(), 11, 31)),
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
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listExchangeLookupOptions({ limit: 200 });
        if (!cancelled) {
          setExchanges(
            rows.map((r) => ({
              id: String(r.id ?? ""),
              name: String(r.name ?? r.label ?? ""),
            })),
          );
        }
      } catch {
        if (!cancelled) setExchanges([]);
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
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
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
        <label className="flex items-end gap-2 pb-1 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={values.showZeroBalances}
            onChange={(e) => onChange({ ...values, showZeroBalances: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
            aria-label="Show zero balances"
          />
          Show zero balances
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
