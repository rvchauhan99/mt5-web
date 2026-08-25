"use client";

import React from "react";
import { formatYyyyMmDdInTimeZone, resolveUserTimeZone } from "@/lib/userTimezone";
import { IconCalendar, IconRefresh, IconFilter } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const tz = resolveUserTimeZone();
      const now = new Date();
      const d = formatYyyyMmDdInTimeZone(now, tz);
      return { date_from: d, date_to: d };
    },
  },
  {
    label: "This Week",
    fn: () => {
      const tz = resolveUserTimeZone();
      const n = new Date(),
        dy = n.getDay(),
        m = new Date(n);
      m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1));
      const e = new Date(m);
      e.setDate(m.getDate() + 6);
      return { date_from: formatYyyyMmDdInTimeZone(m, tz), date_to: formatYyyyMmDdInTimeZone(e, tz) };
    },
  },
  {
    label: "This Month",
    fn: () => {
      const tz = resolveUserTimeZone();
      const n = new Date();
      return {
        date_from: formatYyyyMmDdInTimeZone(new Date(n.getFullYear(), n.getMonth(), 1), tz),
        date_to: formatYyyyMmDdInTimeZone(new Date(n.getFullYear(), n.getMonth() + 1, 0), tz),
      };
    },
  },
  {
    label: "Last 30D",
    fn: () => {
      const tz = resolveUserTimeZone();
      const d = new Date(),
        p = new Date();
      p.setDate(p.getDate() - 30);
      return { date_from: formatYyyyMmDdInTimeZone(p, tz), date_to: formatYyyyMmDdInTimeZone(d, tz) };
    },
  },
  {
    label: "Last 6M",
    fn: () => {
      const tz = resolveUserTimeZone();
      const n = new Date(),
        p = new Date(n);
      p.setMonth(n.getMonth() - 6);
      return { date_from: formatYyyyMmDdInTimeZone(p, tz), date_to: formatYyyyMmDdInTimeZone(n, tz) };
    },
  },
  {
    label: "This Year",
    fn: () => {
      const tz = resolveUserTimeZone();
      const n = new Date();
      return {
        date_from: formatYyyyMmDdInTimeZone(new Date(n.getFullYear(), 0, 1), tz),
        date_to: formatYyyyMmDdInTimeZone(new Date(n.getFullYear(), 11, 31), tz),
      };
    },
  },
];

export const DEFAULT_PRESET = "Today";

interface DashboardFilterBarProps {
  dateFrom: string;
  dateTo: string;
  activePreset: string | null;
  onPreset: (preset: (typeof DATE_PRESETS)[0]) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReset: () => void;
  loading?: boolean;
}

export function DashboardFilterBar({
  dateFrom,
  dateTo,
  activePreset,
  onPreset,
  onDateFromChange,
  onDateToChange,
  onReset,
  loading,
}: DashboardFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Date Preset Chips */}
      <div className="flex items-center gap-1 mr-1">
        <IconCalendar className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Quick:</span>
      </div>
      {DATE_PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => onPreset(p)}
          disabled={loading}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all",
            activePreset === p.label
              ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm"
              : "bg-white border-slate-200 text-slate-500 hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)]",
          )}
        >
          {p.label}
        </button>
      ))}

      {/* Divider */}
      <div className="h-5 w-px bg-slate-200 mx-1" />

      {/* Custom date range */}
      <div className="flex items-center gap-1.5">
        <IconFilter className="w-3 h-3 text-slate-400" />
        <span className="text-[10px] font-medium text-slate-400">Custom:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-colors"
        />
        <span className="text-[10px] text-slate-300">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-colors"
        />
      </div>

      {/* Divider + Reset */}
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={loading}
          className="h-7 text-xs px-2.5 gap-1"
        >
          <IconRefresh className="w-3 h-3" />
          Reset
        </Button>
      </div>
    </div>
  );
}
