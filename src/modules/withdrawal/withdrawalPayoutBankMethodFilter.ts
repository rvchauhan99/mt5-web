import type { LookupBankOption } from "@/services/lookupService";

export function filterWithdrawalPayoutBanks(rows: LookupBankOption[]): LookupBankOption[] {
  return rows.filter((row) => row.isActive !== false && row.isActiveForWithdrawalPayout !== false);
}

export function filterDepositBanks(rows: LookupBankOption[]): LookupBankOption[] {
  return rows.filter((row) => row.isActive !== false && row.isActiveForDeposit !== false);
}
