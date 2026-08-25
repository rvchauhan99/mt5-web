import { formatMoney } from "@/lib/formatMoney";
import type { LiabilityBalanceSide } from "@/types/liability";

/** Platform-side interpretation of a signed balance: +receivable, -payable. */
export function liabilitySideFromSigned(balance: number): LiabilityBalanceSide {
  if (balance === 0) return "settled";
  return balance > 0 ? "receivable" : "payable";
}

export function formatLiabilityMoneyAbs(value: number, currency: string | null | undefined = "INR") {
  return formatMoney(Math.abs(value), currency, {
    includeSign: false,
    maximumFractionDigits: 2,
  });
}

export function liabilitySideBadgeClass(side: LiabilityBalanceSide | undefined): string {
  if (side === "receivable") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (side === "payable") return "text-rose-700 bg-rose-50 border-rose-200";
  return "text-slate-600 bg-slate-100 border-slate-200";
}

export function liabilitySideAmountClass(side: LiabilityBalanceSide | undefined): string {
  if (side === "receivable") return "text-emerald-700";
  if (side === "payable") return "text-rose-700";
  return "text-slate-800";
}
