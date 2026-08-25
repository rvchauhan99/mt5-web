import type { WithdrawalRow } from "@/types/withdrawal";

/** Requested withdrawal with payout UTR + source prefilled from import (ready for banker bulk approve). */
export function isImportReadyWithdrawal(row: WithdrawalRow): boolean {
  const hasUtr = Boolean(row.utr?.trim());
  const hasPayoutSource =
    row.payoutSettlementType === "person"
      ? Boolean(row.payoutLiabilityPersonId?.trim() || row.payoutLiabilityPersonName?.trim())
      : Boolean(row.payoutBankId?.trim() || row.payoutBankName?.trim());
  return row.status === "requested" && hasUtr && hasPayoutSource;
}
