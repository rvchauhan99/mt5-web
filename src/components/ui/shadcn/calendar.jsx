"use client";

import * as React from "react";
import { DayPicker, useDayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildYearRange(fromYear, toYear) {
  const years = [];
  for (let y = fromYear; y <= toYear; y += 1) {
    years.push(y);
  }
  return years;
}

function clampMonthWithinRange(date, fromDate, toDate) {
  if (!fromDate && !toDate) return date;

  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  if (fromDate && firstOfMonth < new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)) {
    return new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  }

  if (toDate && firstOfMonth > new Date(toDate.getFullYear(), toDate.getMonth(), 1)) {
    return new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  }

  return firstOfMonth;
}

function CalendarCaption(props) {
  const { calendarMonth } = props;
  const displayMonth = calendarMonth.date;
  const { goToMonth, fromDate, toDate, fromYear, toYear } = useDayPicker();

  const displayYear = displayMonth.getFullYear();
  const displayMonthIndex = displayMonth.getMonth();

  const todayYear = new Date().getFullYear();
  const effectiveFromYear =
    typeof fromYear === "number"
      ? fromYear
      : fromDate
        ? fromDate.getFullYear()
        : todayYear - 20;
  const effectiveToYear =
    typeof toYear === "number"
      ? toYear
      : toDate
        ? toDate.getFullYear()
        : todayYear + 20;

  const years = React.useMemo(
    () => buildYearRange(effectiveFromYear, effectiveToYear),
    [effectiveFromYear, effectiveToYear]
  );

  const handleMonthChange = (event) => {
    const monthIndex = Number(event.target.value);
    if (Number.isNaN(monthIndex)) return;
    const next = clampMonthWithinRange(new Date(displayYear, monthIndex, 1), fromDate, toDate);
    goToMonth(next);
  };

  const handleYearChange = (event) => {
    const year = Number(event.target.value);
    if (Number.isNaN(year)) return;
    const next = clampMonthWithinRange(new Date(year, displayMonthIndex, 1), fromDate, toDate);
    goToMonth(next);
  };

  return (
    <div className="flex w-full items-center justify-between px-1 pt-1 gap-1">
      <div className="flex items-center gap-1">
        <select
          className="h-6 rounded border border-input bg-background px-1 text-[11px] leading-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={displayMonthIndex}
          onChange={handleMonthChange}
        >
          {MONTH_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="h-6 rounded border border-input bg-background px-1 text-[11px] leading-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={displayYear}
          onChange={handleYearChange}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="size-7 rounded border border-input bg-background inline-flex items-center justify-center hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => {
            const prev = clampMonthWithinRange(
              new Date(displayYear, displayMonthIndex - 1, 1),
              fromDate,
              toDate
            );
            goToMonth(prev);
          }}
        >
          {"<"}
        </button>
        <button
          type="button"
          className="size-7 rounded border border-input bg-background inline-flex items-center justify-center hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => {
            const next = clampMonthWithinRange(
              new Date(displayYear, displayMonthIndex + 1, 1),
              fromDate,
              toDate
            );
            goToMonth(next);
          }}
        >
          {">"}
        </button>
      </div>
    </div>
  );
}

/**
 * Calendar for single-date selection. Used inside DateField popover.
 * Compact, ERP-style layout with single clickable month/year caption.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromDate,
  toDate,
  fromYear,
  toYear,
  ...props
}) {
  const todayYear = new Date().getFullYear();
  const resolvedFromYear = fromYear ?? (fromDate ? fromDate.getFullYear() : todayYear - 20);
  const resolvedToYear = toYear ?? (toDate ? toDate.getFullYear() : todayYear + 20);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fromDate={fromDate}
      toDate={toDate}
      fromYear={resolvedFromYear}
      toYear={resolvedToYear}
      className={cn("rounded-md border border-border bg-background p-1.5", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-1",
        month: "flex flex-col gap-0.5",
        month_caption: "px-1 pt-1",
        caption_label: "hidden",
        nav: "hidden",
        month_grid: "w-full border-collapse",
        weekdays: "flex px-1",
        weekday: "text-muted-foreground rounded w-7 font-normal text-[0.7rem]",
        week: "flex w-full mt-0.5 px-1",
        day: "h-7 w-7 text-center text-xs p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l last:[&:has([aria-selected])]:rounded-r",
        day_button:
          "h-7 w-7 p-0 font-normal rounded hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      components={{
        MonthCaption: (captionProps) => (
          <CalendarCaption
            {...captionProps}
          />
        ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
