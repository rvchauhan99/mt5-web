import { formatMoney, formatWholeMoney } from "./formatMoney";

/** @deprecated Prefer formatMoney / useFormatMoney — currency-aware ISO minor units */
export function formatWholeRupee(value: number, currency: string | null | undefined = "INR") {
  return formatWholeMoney(value, currency);
}

export { formatMoney, formatWholeMoney };
