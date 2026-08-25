import { getCurrencyFractionDigits } from "@/lib/currencies";

/**
 * Format money in the configured platform currency.
 * Fraction digits follow ISO 4217 for the currency unless overridden.
 */
export function formatMoney(
  value: number,
  currency: string | null | undefined,
  options?: {
    withSymbol?: boolean;
    includeSign?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  },
): string {
  const currencyDigits = getCurrencyFractionDigits(currency);
  const {
    withSymbol = true,
    includeSign = false,
    maximumFractionDigits = currencyDigits,
    minimumFractionDigits = currencyDigits,
  } = options ?? {};
  const numericValue = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(numericValue);
  const sign = includeSign && numericValue < 0 ? "−" : numericValue < 0 && !includeSign ? "-" : "";

  if (!currency || !withSymbol) {
    const formatted = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(abs);
    return `${sign}${formatted}`;
  }

  try {
    return `${sign}${new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(abs)}`;
  } catch {
    const formatted = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(abs);
    return `${sign}${currency} ${formatted}`;
  }
}

/**
 * Display helper — uses currency ISO fraction digits (not forced whole units).
 * Kept for call-site compatibility with older "whole rupee" naming.
 */
export function formatWholeMoney(value: number, currency: string | null | undefined): string {
  return formatMoney(value, currency);
}

function currencySymbolPrefix(currency: string | null | undefined): string {
  const withSym = formatMoney(0, currency);
  const withoutSym = formatMoney(0, currency, { withSymbol: false });
  return withSym.replace(withoutSym, "").trim();
}

/** Compact Cr/L display with platform currency symbol. */
export function formatScaledMoney(
  value: number,
  currency: string | null | undefined,
  negativeSign: "−" | "-" = "−",
): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? negativeSign : "";
  const symbol = currencySymbolPrefix(currency);

  if (abs >= 10_00_00_000) {
    return `${sign}${symbol}${(abs / 10_00_00_000).toFixed(2)}Cr`;
  }
  if (abs >= 10_00_000) {
    return `${sign}${symbol}${(abs / 10_00_000).toFixed(2)}L`;
  }
  return formatMoney(value, currency);
}
