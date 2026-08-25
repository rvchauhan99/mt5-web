"use client";

import { useCallback } from "react";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { formatMoney, formatWholeMoney } from "@/lib/formatMoney";

type FormatOptions = {
  withSymbol?: boolean;
  includeSign?: boolean;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

export function useFormatMoney() {
  const { platformCurrency } = usePlatformSettings();

  const format = useCallback(
    (value: number, options?: FormatOptions) =>
      formatMoney(value, platformCurrency, options),
    [platformCurrency],
  );

  const formatWhole = useCallback(
    (value: number) => formatWholeMoney(value, platformCurrency),
    [platformCurrency],
  );

  return { platformCurrency, formatMoney: format, formatWholeMoney: formatWhole };
}
