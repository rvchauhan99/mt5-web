import type { LookupBankOption } from "@/services/lookupService";

/**
 * Methods hidden only for withdrawal company payout-bank selection.
 * Keep these in one place so they can be toggled quickly later.
 */
const WITHDRAWAL_PAYOUT_DISABLED_METHODS = new Set(["cardentry", "sgpay", "trustpay"]);

function normalizeMethod(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function isAllowedWithdrawalPayoutBankMethod(method: string | undefined): boolean {
  const key = normalizeMethod(method);
  if (!key) return true;
  return !WITHDRAWAL_PAYOUT_DISABLED_METHODS.has(key);
}

export function filterWithdrawalPayoutBanks(rows: LookupBankOption[]): LookupBankOption[] {
  return rows.filter((row) => isAllowedWithdrawalPayoutBankMethod(row.method));
}
