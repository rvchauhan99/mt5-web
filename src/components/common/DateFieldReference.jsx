"use client";

import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/shadcn/popover";
import { Calendar } from "@/components/ui/shadcn/calendar";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

/** Normalize value to YYYY-MM-DD (internal/API format). */
function toYYYYMMDD(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = parseDDMMYYYY(value);
    if (d) return formatDateToYYYYMMDD(d);
    const d2 = new Date(value);
    if (!isNaN(d2.getTime())) return d2.toISOString().split("T")[0];
    return "";
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return formatDateToYYYYMMDD(value);
  }
  return "";
}

/** Display format: DD/MM/YYYY. */
function toDDMMYYYY(value) {
  const str = toYYYYMMDD(value);
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

/** Parse DD/MM/YYYY (or D/M/YYYY). Returns Date or null. */
function parseDDMMYYYY(str) {
  if (!str || typeof str !== "string") return null;
  const cleaned = str.trim().replace(/-/g, "/");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  const month = m - 1;
  const date = new Date(y, month, d);
  if (date.getFullYear() !== y || date.getMonth() !== month || date.getDate() !== d) return null;
  return date;
}

function formatDateToYYYYMMDD(date) {
  if (!date || !(date instanceof Date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toDateOnly(value) {
  const str = toYYYYMMDD(value);
  if (!str) return undefined;
  return new Date(str + "T12:00:00");
}

/**
 * Apply DD/MM/YYYY mask: only digits and slashes in correct positions.
 * Returns masked string (max 10 chars: DD/MM/YYYY).
 */
function applyDDMMYYYYMask(str) {
  const digits = str.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Single input: same look as before. Click input to open calendar; type DD/MM/YYYY only.
 * Only DD/MM/YYYY is allowed (masked input). No separate calendar button.
 */
const DateField = forwardRef(function DateField(
  {
    name,
    label,
    value,
    onChange,
    error = false,
    helperText = null,
    fullWidth = true,
    size = "small",
    disabled = false,
    required = false,
    minDate = null,
    maxDate = null,
    className,
    ...otherProps
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [editStr, setEditStr] = useState(() => toDDMMYYYY(value));

  const selectedDate = toDateOnly(value);
  const min = minDate ? toDateOnly(minDate) : undefined;
  const max = maxDate ? toDateOnly(maxDate) : undefined;

  useEffect(() => {
    setEditStr(toDDMMYYYY(value));
  }, [value]);

  const handleInputChange = (e) => {
    const raw = e.target.value;
    const masked = applyDDMMYYYYMask(raw);
    setEditStr(masked);
    setOpen(false); // close calendar when typing
    const parsed = parseDDMMYYYY(masked);
    if (parsed && masked.length === 10) {
      if (onChange) {
        onChange({ target: { name, value: formatDateToYYYYMMDD(parsed) } });
      }
    } else if (masked.length === 0 && onChange) {
      onChange({ target: { name, value: "" } });
    }
  };

  const handleBlur = () => {
    const parsed = parseDDMMYYYY(editStr);
    if (parsed) {
      const yyyyMmDd = formatDateToYYYYMMDD(parsed);
      if (onChange) {
        onChange({ target: { name, value: yyyyMmDd } });
      }
      setEditStr(toDDMMYYYY(yyyyMmDd));
    } else {
      setEditStr(toDDMMYYYY(value));
    }
  };

  const handleCalendarSelect = (date) => {
    const yyyyMmDd = date ? formatDateToYYYYMMDD(date) : "";
    if (onChange) {
      onChange({ target: { name, value: yyyyMmDd } });
    }
    setEditStr(toDDMMYYYY(yyyyMmDd));
    setOpen(false);
  };

  return (
    <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
      {label && (
        <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Input
            ref={ref}
            type="text"
            id={name}
            name={name}
            value={editStr}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder="DD/MM/YYYY"
            maxLength={10}
            autoComplete="off"
            className={cn(
              size === "small" && `${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`,
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...otherProps}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            defaultMonth={selectedDate || undefined}
            fromDate={min}
            toDate={max}
          />
        </PopoverContent>
      </Popover>
      {error && helperText && (
        <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
      )}
    </div>
  );
});

DateField.displayName = "DateField";

export default DateField;
