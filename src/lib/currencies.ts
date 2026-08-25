export const SUPPORTED_CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "AUD",
  "CAD",
  "SGD",
  "NPR",
  "PKR",
  "BDT",
  "LKR",
  "MYR",
  "THB",
  "JPY",
  "CNY",
  "HKD",
  "NZD",
  "CHF",
  "ZAR",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** ISO 4217 minor-unit digits — must match API. */
export const CURRENCY_FRACTION_DIGITS: Record<SupportedCurrency, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
  AUD: 2,
  CAD: 2,
  SGD: 2,
  NPR: 2,
  PKR: 2,
  BDT: 2,
  LKR: 2,
  MYR: 2,
  THB: 2,
  JPY: 0,
  CNY: 2,
  HKD: 2,
  NZD: 2,
  CHF: 2,
  ZAR: 2,
};

export const EXCHANGE_RATE_FRACTION_DIGITS = 8;

export type MoneyFxPayload = {
  operatedCurrency: string;
  operatedAmount: number;
  exchangeRate: number;
};

export function getCurrencyFractionDigits(currency: string | null | undefined): number {
  if (currency && currency in CURRENCY_FRACTION_DIGITS) {
    return CURRENCY_FRACTION_DIGITS[currency as SupportedCurrency];
  }
  return 2;
}

export function getCurrencyMinUnit(currency: string | null | undefined): number {
  const digits = getCurrencyFractionDigits(currency);
  return digits === 0 ? 1 : 10 ** -digits;
}

/** Round half-up (CRM / accounting standard) avoiding float traps like 1.005. */
export function roundHalfUp(value: number, fractionDigits: number): number {
  if (!Number.isFinite(value)) return NaN;
  if (value === 0) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const shifted = Number(`${abs}e${fractionDigits}`);
  if (!Number.isFinite(shifted)) {
    const factor = 10 ** fractionDigits;
    return (sign * Math.round(abs * factor + Number.EPSILON)) / factor;
  }
  const rounded = Math.round(shifted);
  return sign * Number(`${rounded}e-${fractionDigits}`);
}

export function roundMoneyToCurrency(value: number, currency: string | null | undefined): number {
  return roundHalfUp(value, getCurrencyFractionDigits(currency));
}

export function roundExchangeRate(rate: number): number {
  return roundHalfUp(rate, EXCHANGE_RATE_FRACTION_DIGITS);
}

/**
 * platformAmount = roundHalfUp(operatedAmount × rate, platform minor units)
 * Operated amount is first normalized to operated-currency minor units.
 */
export function computePlatformAmount(
  operatedAmount: number,
  exchangeRate: number,
  platformCurrency: string,
  operatedCurrency?: string,
): number {
  const opCurrency = operatedCurrency || platformCurrency;
  const normalizedOperated = roundMoneyToCurrency(operatedAmount, opCurrency);
  const rate = opCurrency === platformCurrency ? 1 : roundExchangeRate(exchangeRate);
  return roundMoneyToCurrency(normalizedOperated * rate, platformCurrency);
}
