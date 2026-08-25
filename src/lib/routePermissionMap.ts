import { NAV_PERMISSIONS } from "@/lib/constants/navPermissions";

export type RouteAccess =
  | { kind: "open" }
  | { kind: "permission"; permission: string }
  | { kind: "anyPermission"; permissions: string[] }
  | { kind: "superadminOnly" };

const PREFIX_RULES: { prefix: string; access: RouteAccess }[] = [
  { prefix: "/sub-admin/add", access: { kind: "permission", permission: NAV_PERMISSIONS.SUB_ADMIN_ADD } },
  { prefix: "/sub-admin/list", access: { kind: "permission", permission: NAV_PERMISSIONS.SUB_ADMIN_LIST } },
  { prefix: "/sub-admin/edit", access: { kind: "permission", permission: NAV_PERMISSIONS.SUB_ADMIN_EDIT } },
  { prefix: "/exchange/add", access: { kind: "permission", permission: NAV_PERMISSIONS.EXCHANGE_ADD } },
  { prefix: "/exchange/list", access: { kind: "permission", permission: NAV_PERMISSIONS.EXCHANGE_LIST } },
  { prefix: "/exchange/statement", access: { kind: "permission", permission: NAV_PERMISSIONS.EXCHANGE_STATEMENT } },
  {
    prefix: "/exchange/top-up",
    access: {
      kind: "anyPermission",
      permissions: [NAV_PERMISSIONS.EXCHANGE_TOPUP_ADD, NAV_PERMISSIONS.EXCHANGE_TOPUP_LIST],
    },
  },
  { prefix: "/player/add", access: { kind: "permission", permission: NAV_PERMISSIONS.PLAYER_ADD } },
  { prefix: "/player/list", access: { kind: "permission", permission: NAV_PERMISSIONS.PLAYER_LIST } },
  { prefix: "/player/edit", access: { kind: "permission", permission: NAV_PERMISSIONS.PLAYER_EDIT } },
  { prefix: "/bank/add", access: { kind: "permission", permission: NAV_PERMISSIONS.BANK_ADD } },
  { prefix: "/bank/list", access: { kind: "permission", permission: NAV_PERMISSIONS.BANK_LIST } },
  { prefix: "/bank/statement", access: { kind: "permission", permission: NAV_PERMISSIONS.BANK_STATEMENT } },
  { prefix: "/deposit/banker", access: { kind: "permission", permission: NAV_PERMISSIONS.DEPOSIT_BANKER } },
  { prefix: "/deposit/exchange", access: { kind: "permission", permission: NAV_PERMISSIONS.DEPOSIT_EXCHANGE } },
  {
    prefix: "/deposit/final-list",
    access: { kind: "permission", permission: NAV_PERMISSIONS.DEPOSIT_FINAL_VIEW },
  },
  {
    prefix: "/withdrawal/exchange",
    access: { kind: "permission", permission: NAV_PERMISSIONS.WITHDRAWAL_EXCHANGE },
  },
  {
    prefix: "/withdrawal/banker",
    access: { kind: "permission", permission: NAV_PERMISSIONS.WITHDRAWAL_BANKER },
  },
  {
    prefix: "/withdrawal/final-list",
    access: { kind: "permission", permission: NAV_PERMISSIONS.WITHDRAWAL_FINAL_VIEW },
  },
  { prefix: "/expense/add", access: { kind: "permission", permission: NAV_PERMISSIONS.EXPENSE_ADD } },
  { prefix: "/expense/list", access: { kind: "permission", permission: NAV_PERMISSIONS.EXPENSE_LIST } },
  { prefix: "/expense/audit", access: { kind: "permission", permission: NAV_PERMISSIONS.EXPENSE_AUDIT } },
  {
    prefix: "/liability/persons",
    access: {
      kind: "anyPermission",
      permissions: [NAV_PERMISSIONS.LIABILITY_PERSON_ADD, NAV_PERMISSIONS.LIABILITY_PERSON_LIST],
    },
  },
  {
    prefix: "/liability/entries",
    access: {
      kind: "anyPermission",
      permissions: [NAV_PERMISSIONS.LIABILITY_ENTRY_ADD, NAV_PERMISSIONS.LIABILITY_ENTRY_LIST],
    },
  },
  {
    prefix: "/liability/ledger",
    access: { kind: "permission", permission: NAV_PERMISSIONS.LIABILITY_LEDGER_VIEW },
  },
  {
    prefix: "/referral/settlement",
    access: {
      kind: "anyPermission",
      permissions: [NAV_PERMISSIONS.REFERRAL_LIST, NAV_PERMISSIONS.REFERRAL_SETTLE],
    },
  },
  {
    prefix: "/reports/liability",
    access: { kind: "permission", permission: NAV_PERMISSIONS.LIABILITY_REPORT_VIEW },
  },
  { prefix: "/reports/transaction-history", access: { kind: "permission", permission: NAV_PERMISSIONS.REPORTS_TRANSACTION_HISTORY } },
  { prefix: "/reports/expense-analysis", access: { kind: "permission", permission: NAV_PERMISSIONS.REPORTS_EXPENSE_ANALYSIS } },
  { prefix: "/user-history", access: { kind: "permission", permission: NAV_PERMISSIONS.USER_HISTORY_VIEW } },
  { prefix: "/dashboard", access: { kind: "permission", permission: NAV_PERMISSIONS.DASHBOARD_VIEW } },
  { prefix: "/masters", access: { kind: "superadminOnly" } },
  /** Detail routes (e.g. /exchange/:id) — same as list (no separate edit screen) */
  { prefix: "/exchange", access: { kind: "permission", permission: NAV_PERMISSIONS.EXCHANGE_LIST } },
  { prefix: "/player", access: { kind: "permission", permission: NAV_PERMISSIONS.PLAYER_LIST } },
  {
    prefix: "/bank",
    access: { kind: "permission", permission: NAV_PERMISSIONS.BANK_LIST },
  },
];

PREFIX_RULES.sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * Resolves access for app routes under the dashboard shell. Unknown paths default to `open`
 * (authenticated layout already requires login).
 */
export function getRouteAccess(pathname: string): RouteAccess {
  const path = pathname.split("?")[0] ?? pathname;
  for (const { prefix, access } of PREFIX_RULES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return access;
    }
  }
  return { kind: "open" };
}

export function canAccessRoute(
  pathname: string,
  role: string | undefined,
  permissions: string[] | undefined
): boolean {
  if (role === "superadmin") return true;
  const access = getRouteAccess(pathname);
  if (access.kind === "open") return true;
  if (access.kind === "superadminOnly") return false;
  if (access.kind === "anyPermission") {
    const perms = permissions ?? [];
    return access.permissions.some((p) => perms.includes(p));
  }
  return (permissions ?? []).includes(access.permission);
}
