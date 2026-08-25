/** URL param keys for deposit final list filters (shared by hook + filter panel). */
export const DEPOSIT_FINAL_FILTER_KEYS = [
  "utr",
  "utr_op",
  "bankName",
  "bankName_op",
  "bankId",
  "status",
  "hasAmendment",
  "amount",
  "amount_to",
  "amount_op",
  "totalAmount",
  "totalAmount_to",
  "totalAmount_op",
  "player",
  "createdBy",
  "createdAt_from",
  "createdAt_to",
  "createdAt_op",
] as const;

export type DepositFinalFilterKey = (typeof DEPOSIT_FINAL_FILTER_KEYS)[number];

export function emptyDepositFinalFilters(): Record<DepositFinalFilterKey, string> {
  return Object.fromEntries(DEPOSIT_FINAL_FILTER_KEYS.map((k) => [k, ""])) as Record<
    DepositFinalFilterKey,
    string
  >;
}
