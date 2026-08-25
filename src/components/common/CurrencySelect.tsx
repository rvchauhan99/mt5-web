"use client";

import { useCallback, useMemo } from "react";
import {
  AutocompleteField,
  type AutocompleteOption,
} from "@/components/common/AutocompleteField";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

type CurrencySelectProps = {
  value: string;
  onChange: (code: string) => void;
  currencies?: readonly string[] | string[];
  platformCurrency?: string | null;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
};

function currencyLabel(code: string, platformCurrency?: string | null): string {
  if (platformCurrency && code === platformCurrency) return `${code} (platform)`;
  return code;
}

export function CurrencySelect({
  value,
  onChange,
  currencies = SUPPORTED_CURRENCIES,
  platformCurrency = null,
  disabled = false,
  placeholder = "Search currency...",
  id,
  "aria-label": ariaLabel = "Currency",
}: CurrencySelectProps) {
  const codes = useMemo(() => {
    const list = currencies.length ? [...currencies] : [...SUPPORTED_CURRENCIES];
    return Array.from(new Set(list.map((c) => c.trim().toUpperCase()).filter(Boolean)));
  }, [currencies]);

  const loadOptions = useCallback(
    async (query: string): Promise<AutocompleteOption[]> => {
      const q = query.trim().toUpperCase();
      const filtered = q
        ? codes.filter((code) => code.includes(q) || currencyLabel(code, platformCurrency).toUpperCase().includes(q))
        : codes;
      return filtered.map((code) => ({
        value: code,
        label: currencyLabel(code, platformCurrency),
      }));
    },
    [codes, platformCurrency],
  );

  const defaultOption = useMemo((): AutocompleteOption | null => {
    if (!value) return null;
    return { value, label: currencyLabel(value, platformCurrency) };
  }, [value, platformCurrency]);

  return (
    <div id={id} aria-label={ariaLabel}>
      <AutocompleteField
        value={value}
        onChange={onChange}
        loadOptions={loadOptions}
        placeholder={placeholder}
        disabled={disabled}
        debounceMs={50}
        emptyText="No currencies found"
        defaultOption={defaultOption}
      />
    </div>
  );
}
