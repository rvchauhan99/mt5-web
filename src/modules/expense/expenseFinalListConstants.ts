/** URL param keys for expense final list filters (shared by hook + filter panel). */
export const EXPENSE_FINAL_FILTER_KEYS = [
  "q",
  "status",
  "bankId",
  "expenseTypeId",
  "amount",
  "amount_to",
  "amount_op",
  "createdBy",
  "approvedBy",
  "createdAt_from",
  "createdAt_to",
  "createdAt_op",
  "expenseDate_from",
  "expenseDate_to",
  "expenseDate_op",
] as const;

export type ExpenseFinalFilterKey = (typeof EXPENSE_FINAL_FILTER_KEYS)[number];

export function emptyExpenseFinalFilters(): Record<ExpenseFinalFilterKey, string> {
  return Object.fromEntries(EXPENSE_FINAL_FILTER_KEYS.map((k) => [k, ""])) as Record<
    ExpenseFinalFilterKey,
    string
  >;
}
