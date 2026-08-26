"use client";

import { useEffect, useMemo, useState } from "react";
import { CurrencySelect } from "@/components/common/CurrencySelect";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { MasterField } from "@/types/masters";
import { cn } from "@/lib/cn";
import type { MasterModelKey } from "@/lib/mastersSchemas";
import { validateMasterPayload } from "@/lib/mastersSchemas";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

function formatFieldLabel(name: string): string {
  if (name === "isActiveForWithdrawalPayout") return "Active for withdrawal payout bank";
  if (name === "isActiveForDeposit") return "Active for deposit bank";
  const spaced = name.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isCurrencyField(name: string): boolean {
  return name === "fromCurrency" || name === "toCurrency";
}

function buildInitial(
  fields: MasterField[],
  defaultValues: Record<string, unknown> | null,
): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const f of fields) {
    if (defaultValues && defaultValues[f.name] !== undefined) {
      base[f.name] = defaultValues[f.name];
      continue;
    }
    if (f.type === "BOOLEAN") {
      base[f.name] =
        f.name === "isActive" ||
        f.name === "isActiveForWithdrawalPayout" ||
        f.name === "isActiveForDeposit"
          ? true
          : false;
    } else if (f.name === "reasonType") {
      base[f.name] = "general";
    } else if (f.type === "INTEGER" || f.type === "DECIMAL") {
      base[f.name] = "";
    } else {
      base[f.name] = "";
    }
  }
  return base;
}

type Props = {
  fields: MasterField[];
  defaultValues?: Record<string, unknown> | null;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  loading?: boolean;
  viewMode?: boolean;
  requiredFields?: string[];
  onCancel?: () => void;
  submitLabel?: string;
  /** Required for create/edit validation (Zod). */
  modelKey?: MasterModelKey;
  formMode?: "create" | "edit";
};

export function MasterForm({
  fields,
  defaultValues = null,
  onSubmit,
  loading = false,
  viewMode = false,
  requiredFields = [],
  onCancel,
  submitLabel = "Save",
  modelKey,
  formMode = "create",
}: Props) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => buildInitial(fields, defaultValues));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const idKey = defaultValues?._id != null ? String(defaultValues._id) : "new";

  useEffect(() => {
    setFormData(buildInitial(fields, defaultValues));
    setErrors({});
  }, [fields, idKey, defaultValues]);

  const requiredSet = useMemo(() => new Set(requiredFields), [requiredFields]);

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      delete next._form;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode) return;

    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = formData[f.name];
      if (f.type === "INTEGER" || f.type === "DECIMAL") {
        const s = raw === "" || raw === undefined ? "" : String(raw);
        if (s === "") continue;
        payload[f.name] = Number(s);
      } else if (f.type === "BOOLEAN") {
        payload[f.name] = Boolean(raw);
      } else if (f.type === "DATE" && typeof raw === "string" && raw !== "") {
        payload[f.name] = new Date(raw).toISOString();
      } else if (raw !== undefined && raw !== "") {
        payload[f.name] = raw;
      }
    }

    if (modelKey) {
      const zod = validateMasterPayload(modelKey, formMode, payload);
      if (!zod.success) {
        setErrors(zod.fieldErrors);
        return;
      }
      await onSubmit?.(zod.data);
      return;
    }

    const next: Record<string, string> = {};
    for (const f of fields) {
      const req = f.required || requiredSet.has(f.name);
      const raw = formData[f.name];
      if (req) {
        if (f.type === "BOOLEAN") continue;
        if (raw === undefined || raw === null || String(raw).trim() === "") {
          next[f.name] = `${formatFieldLabel(f.name)} is required.`;
        }
      }
      if (
        (f.type === "INTEGER" || f.type === "DECIMAL") &&
        raw !== undefined &&
        raw !== null &&
        String(raw).trim() !== ""
      ) {
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          next[f.name] = "Invalid number.";
        }
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await onSubmit?.(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._form && (
        <p className="rounded-md border border-[var(--danger)] bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {errors._form}
        </p>
      )}
      {fields.map((field) => {
        const label = formatFieldLabel(field.name);
        const err = errors[field.name];
        const disabled = viewMode || loading;

        if (field.type === "TEXT") {
          return (
            <div key={field.name}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
              <textarea
                className={cn(
                  "min-h-[100px] w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[15px] font-medium text-gray-800",
                  "disabled:cursor-not-allowed disabled:bg-gray-50",
                )}
                value={String(formData[field.name] ?? "")}
                onChange={(e) => handleChange(field.name, e.target.value)}
                disabled={disabled}
              />
              {err && <p className="mt-1 text-sm text-[var(--danger)]">{err}</p>}
            </div>
          );
        }

        if (field.type === "BOOLEAN") {
          return (
            <div key={field.name}>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={Boolean(formData[field.name])}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  disabled={disabled}
                />
                {label}
              </label>
              {err && <p className="mt-1 text-sm text-[var(--danger)]">{err}</p>}
            </div>
          );
        }

        if (field.type === "INTEGER" || field.type === "DECIMAL") {
          return (
            <div key={field.name}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
              <Input
                type="number"
                inputMode="decimal"
                step={field.type === "DECIMAL" ? "any" : 1}
                value={formData[field.name] === "" || formData[field.name] == null ? "" : String(formData[field.name])}
                onChange={(e) => handleChange(field.name, e.target.value)}
                disabled={disabled}
                error={Boolean(err)}
                errorMessage={err}
              />
            </div>
          );
        }

        if (field.type === "DATE") {
          const v = formData[field.name];
          let localVal = "";
          if (v instanceof Date) {
            localVal = v.toISOString().slice(0, 10);
          } else if (typeof v === "string" && v) {
            localVal = v.slice(0, 10);
          }
          return (
            <div key={field.name}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
              <Input
                type="date"
                value={localVal}
                onChange={(e) => handleChange(field.name, e.target.value)}
                disabled={disabled}
                error={Boolean(err)}
                errorMessage={err}
              />
            </div>
          );
        }

        if (isCurrencyField(field.name)) {
          return (
            <div key={field.name}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
              <CurrencySelect
                value={String(formData[field.name] ?? "")}
                onChange={(code) => handleChange(field.name, code)}
                currencies={SUPPORTED_CURRENCIES}
                placeholder="Search currency..."
                aria-label={label}
                disabled={disabled}
              />
              {err ? <p className="mt-1 text-sm text-[var(--danger)]">{err}</p> : null}
            </div>
          );
        }

        return (
          <div key={field.name}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <Input
              value={String(formData[field.name] ?? "")}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={disabled}
              error={Boolean(err)}
              errorMessage={err}
            />
          </div>
        );
      })}

      {!viewMode && (
        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              startIcon={<IconX size={16} />}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" loading={loading} startIcon={<IconCheck size={16} />}>
            {submitLabel}
          </Button>
        </div>
      )}
      {viewMode && onCancel && (
        <div className="flex justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} startIcon={<IconX size={16} />}>
            Close
          </Button>
        </div>
      )}
    </form>
  );
}
