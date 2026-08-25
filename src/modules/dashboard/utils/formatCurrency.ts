import { formatMoney } from "@/lib/formatMoney";

type FormatDashboardCurrencyOptions = {
  withSymbol?: boolean;
  includeSign?: boolean;
  currency?: string | null;
};

export function formatDashboardCurrency(
  value: number,
  options: FormatDashboardCurrencyOptions = {},
) {
  const { withSymbol = true, includeSign = true, currency = "INR" } = options;
  return formatMoney(value, withSymbol ? currency : null, {
    includeSign,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}
