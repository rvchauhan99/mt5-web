"use client";

import { useState, type ComponentType } from "react";
import { IconCalendar } from "@tabler/icons-react";
import { Calendar } from "@/components/ui/shadcn/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/shadcn/popover";
import { Button } from "@/components/ui/Button";

const RangeCalendar = Calendar as unknown as ComponentType<Record<string, unknown>>;

interface DateRange {
  from?: Date;
  to?: Date;
}

export interface BalanceSheetDateRangePickerProps {
  fromDate: string;
  toDate: string;
  onChange: (range: { fromDate: string; toDate: string }) => void;
}

function parseYmd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : undefined;
}

function toLocalYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(value: string) {
  const date = parseYmd(value);
  return date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : value;
}

export function BalanceSheetDateRangePicker({ fromDate, toDate, onChange }: BalanceSheetDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({ from: parseYmd(fromDate), to: parseYmd(toDate) });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setRange({ from: parseYmd(fromDate), to: parseYmd(toDate) });
  };

  const apply = () => {
    if (!range.from || !range.to) return;
    onChange({ fromDate: toLocalYmd(range.from), toDate: toLocalYmd(range.to) });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300" aria-label="Choose date range">
          <IconCalendar size={15} className="text-slate-400" />
          <span>{displayDate(fromDate)} → {displayDate(toDate)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <RangeCalendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
        <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" size="xs" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" size="xs" onClick={apply} disabled={!range.from || !range.to}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}