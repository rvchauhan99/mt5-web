/** URL param keys for withdrawal final list filters (shared by hook + filter panel). */
export const WITHDRAWAL_FINAL_FILTER_KEYS = [
  "utr",
  "utr_op",
  "bankName",
  "bankName_op",
  "playerName",
  "playerName_op",
  "status",
  "hasAmendment",
  "amount",
  "amount_to",
  "amount_op",
  "payableAmount",
  "payableAmount_to",
  "payableAmount_op",
  "createdBy",
  "approvedBy",
  "createdAt_from",
  "createdAt_to",
  "createdAt_op",
] as const;

export type WithdrawalFinalFilterKey = (typeof WITHDRAWAL_FINAL_FILTER_KEYS)[number];

export function emptyWithdrawalFinalFilters(): Record<WithdrawalFinalFilterKey, string> {
  return Object.fromEntries(WITHDRAWAL_FINAL_FILTER_KEYS.map((k) => [k, ""])) as Record<
    WithdrawalFinalFilterKey,
    string
  >;
}
