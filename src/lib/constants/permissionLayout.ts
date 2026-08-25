/**
 * Top-level module column order for the Sub Admin permission grid.
 * Keep aligned with `NAV_ITEMS` in `./navigation.ts` (sidebar).
 * The masters area is superadmin-only and not assignable via this grid.
 */
export const PERMISSION_MODULE_ORDER: string[] = [
  "dashboard",
  "sub_admin",
  "exchange",
  "player",
  "bank",
  "deposit",
  "withdrawal",
  "expense",
  "liability",
  "reports",
  "user_history",
];

/**
 * Checkbox order within a module when API alphabetical order differs from the sidebar submenu order.
 * Actions not listed sort after known ones, alphabetically among themselves.
 */
export const PERMISSION_ACTION_ORDER: Partial<Record<string, string[]>> = {
  exchange: ["add", "list", "statement", "topup_add", "topup_list"],
  player: ["add", "list", "edit"],
  bank: ["add", "list", "statement"],
  deposit: ["banker", "exchange", "final_view"],
  withdrawal: ["exchange", "banker", "final_view"],
  reports: ["transaction_history", "expense_analysis", "liability"],
  expense: ["add", "list", "audit"],
  liability: ["persons", "entries", "ledger"],
};

export function sortPermissionsInModule<T extends { action: string }>(module: string, permissions: T[]): T[] {
  const order = PERMISSION_ACTION_ORDER[module];
  if (!order?.length) {
    return [...permissions].sort((a, b) => a.action.localeCompare(b.action));
  }
  return [...permissions].sort((a, b) => {
    const ia = order.indexOf(a.action);
    const ib = order.indexOf(b.action);
    const aKnown = ia !== -1;
    const bKnown = ib !== -1;
    if (aKnown && bKnown) return ia - ib;
    if (aKnown && !bKnown) return -1;
    if (!aKnown && bKnown) return 1;
    return a.action.localeCompare(b.action);
  });
}
