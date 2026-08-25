import { AppNavNode } from "@/types/navigation";
import { NAV_PERMISSIONS } from "@/lib/constants/navPermissions";

/**
 * Hides nodes whose `allowedRoles` does not include the current user's role.
 * Empty or missing `allowedRoles` means visible to everyone.
 */
export function filterNavByRole(nodes: AppNavNode[], role: string | undefined): AppNavNode[] {
  const r = role ?? "";
  const out: AppNavNode[] = [];
  for (const node of nodes) {
    if (node.allowedRoles?.length && !node.allowedRoles.includes(r)) {
      continue;
    }
    if (node.children?.length) {
      const children = filterNavByRole(node.children, role);
      if (children.length === 0 && !node.href) continue;
      out.push({ ...node, children });
    } else {
      out.push({ ...node });
    }
  }
  return out;
}

/**
 * Hides leaf items whose `requiredPermission` is not in `permissions` for non-superadmin users.
 * Leaves without `requiredPermission` stay visible to any authenticated user.
 * Superadmin: returns `nodes` unchanged (call after `filterNavByRole`).
 */
export function filterNavByPermissions(
  nodes: AppNavNode[],
  role: string | undefined,
  permissions: string[] | undefined
): AppNavNode[] {
  if (role === "superadmin") {
    return nodes;
  }
  const perms = permissions ?? [];
  const out: AppNavNode[] = [];
  for (const node of nodes) {
    if (node.children?.length) {
      const children = filterNavByPermissions(node.children, role, perms);
      if (children.length === 0 && !node.href) continue;
      out.push({ ...node, children });
    } else {
      if (node.requiredPermission && !perms.includes(node.requiredPermission)) {
        continue;
      }
      out.push({ ...node });
    }
  }
  return out;
}

export function filterNavForUser(
  nodes: AppNavNode[],
  role: string | undefined,
  permissions: string[] | undefined
): AppNavNode[] {
  const byRole = filterNavByRole(nodes, role);
  return filterNavByPermissions(byRole, role, permissions);
}

export const NAV_ITEMS: AppNavNode[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    keywords: ["home", "summary"],
    requiredPermission: NAV_PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    id: "sub-admin",
    label: "Sub Admin",
    children: [
      {
        id: "sub-admin-add",
        label: "Add",
        href: "/sub-admin/add",
        keywords: ["create", "user"],
        requiredPermission: NAV_PERMISSIONS.SUB_ADMIN_ADD,
      },
      {
        id: "sub-admin-list",
        label: "List",
        href: "/sub-admin/list",
        keywords: ["manage"],
        requiredPermission: NAV_PERMISSIONS.SUB_ADMIN_LIST,
      },
      {
        id: "sub-admin-edit",
        label: "Edit",
        href: "/sub-admin/edit",
        keywords: ["update", "password", "permissions"],
        requiredPermission: NAV_PERMISSIONS.SUB_ADMIN_EDIT,
      },
    ],
  },
  {
    id: "exchange",
    label: "Exchange",
    children: [
      {
        id: "exchange-add",
        label: "Add",
        href: "/exchange/add",
        keywords: ["provider"],
        requiredPermission: NAV_PERMISSIONS.EXCHANGE_ADD,
      },
      {
        id: "exchange-list",
        label: "List",
        href: "/exchange/list",
        keywords: ["transfer"],
        requiredPermission: NAV_PERMISSIONS.EXCHANGE_LIST,
      },
      {
        id: "exchange-statement",
        label: "Statement",
        href: "/exchange/statement",
        keywords: ["ledger", "report"],
        requiredPermission: NAV_PERMISSIONS.EXCHANGE_STATEMENT,
      },
      {
        id: "exchange-top-up",
        label: "Top Up",
        href: "/exchange/top-up",
        keywords: ["credit", "balance"],
        requiredPermission: NAV_PERMISSIONS.EXCHANGE_TOPUP_ADD,
      },
    ],
  },
  {
    id: "player",
    label: "Player",
    children: [
      {
        id: "player-add",
        label: "Add",
        href: "/player/add",
        keywords: ["onboard"],
        requiredPermission: NAV_PERMISSIONS.PLAYER_ADD,
      },
      {
        id: "player-list",
        label: "List",
        href: "/player/list",
        keywords: ["search"],
        requiredPermission: NAV_PERMISSIONS.PLAYER_LIST,
      },
      {
        id: "player-edit",
        label: "Edit",
        href: "/player/edit",
        keywords: ["update", "modify"],
        requiredPermission: NAV_PERMISSIONS.PLAYER_EDIT,
      },
    ],
  },
  {
    id: "bank",
    label: "Bank",
    children: [
      {
        id: "bank-add",
        label: "Add",
        href: "/bank/add",
        keywords: ["account"],
        requiredPermission: NAV_PERMISSIONS.BANK_ADD,
      },
      {
        id: "bank-list",
        label: "List",
        href: "/bank/list",
        keywords: ["b2b", "expense"],
        requiredPermission: NAV_PERMISSIONS.BANK_LIST,
      },
      {
        id: "bank-statement",
        label: "Statement",
        href: "/bank/statement",
        keywords: ["utr"],
        requiredPermission: NAV_PERMISSIONS.BANK_STATEMENT,
      },
    ],
  },
  {
    id: "deposit",
    label: "Deposit",
    children: [
      {
        id: "deposit-banker",
        label: "Banker",
        href: "/deposit/banker",
        keywords: ["banker deposit", "create"],
        requiredPermission: NAV_PERMISSIONS.DEPOSIT_BANKER,
      },
      {
        id: "deposit-exchange",
        label: "Exchange",
        href: "/deposit/exchange",
        keywords: ["depositor"],
        requiredPermission: NAV_PERMISSIONS.DEPOSIT_EXCHANGE,
      },
      {
        id: "deposit-final-view",
        label: "Final view",
        href: "/deposit/final-list",
        keywords: ["finalize", "view"],
        requiredPermission: NAV_PERMISSIONS.DEPOSIT_FINAL_VIEW,
      },
    ],
  },
  {
    id: "withdrawal",
    label: "Withdrawal",
    children: [
      {
        id: "withdrawal-exchange",
        label: "Exchange",
        href: "/withdrawal/exchange",
        keywords: ["request", "create"],
        requiredPermission: NAV_PERMISSIONS.WITHDRAWAL_EXCHANGE,
      },
      {
        id: "withdrawal-banker",
        label: "Banker",
        href: "/withdrawal/banker",
        keywords: ["payout", "listing"],
        requiredPermission: NAV_PERMISSIONS.WITHDRAWAL_BANKER,
      },
      {
        id: "withdrawal-final-view",
        label: "Final",
        href: "/withdrawal/final-list",
        keywords: ["approve", "view", "finalize"],
        requiredPermission: NAV_PERMISSIONS.WITHDRAWAL_FINAL_VIEW,
      },
    ],
  },
  {
    id: "expense",
    label: "Expense",
    children: [
      {
        id: "expense-add",
        label: "Add",
        href: "/expense/add",
        keywords: ["create"],
        requiredPermission: NAV_PERMISSIONS.EXPENSE_ADD,
      },
      {
        id: "expense-list",
        label: "List",
        href: "/expense/list",
        keywords: ["search", "types", "masters", "update", "patch"],
        requiredPermission: NAV_PERMISSIONS.EXPENSE_LIST,
      },
      {
        id: "expense-audit",
        label: "Audit",
        href: "/expense/audit",
        keywords: ["approve", "reject"],
        requiredPermission: NAV_PERMISSIONS.EXPENSE_AUDIT,
      },
    ],
  },
  {
    id: "liability",
    label: "Liability",
    children: [
      {
        id: "liability-persons",
        label: "Persons",
        href: "/liability/persons",
        keywords: ["debtor", "creditor", "master"],
        requiredPermission: NAV_PERMISSIONS.LIABILITY_PERSON_LIST,
      },
      {
        id: "liability-entries",
        label: "Entries",
        href: "/liability/entries",
        keywords: ["transfer", "voucher", "posting"],
        requiredPermission: NAV_PERMISSIONS.LIABILITY_ENTRY_LIST,
      },
      {
        id: "liability-ledger",
        label: "Ledger",
        href: "/liability/ledger",
        keywords: ["statement", "running balance"],
        requiredPermission: NAV_PERMISSIONS.LIABILITY_LEDGER_VIEW,
      },
    ],
  },
  {
    id: "referral",
    label: "Referral",
    children: [
      {
        id: "referral-settlement",
        label: "Settlement",
        href: "/referral/settlement",
        keywords: ["bonus", "accrual", "manual"],
        requiredPermission: NAV_PERMISSIONS.REFERRAL_LIST,
      },
    ],
  },
  {
    id: "masters",
    label: "Masters",
    allowedRoles: ["superadmin"],
    children: [{ id: "masters-panel", label: "Panel", href: "/masters", keywords: ["reason", "expense type", "lookup"] }],
  },
  {
    id: "reports",
    label: "Reports",
    children: [
      {
        id: "reports-transaction-history",
        label: "Transaction History",
        href: "/reports/transaction-history",
        keywords: ["history", "export"],
        requiredPermission: NAV_PERMISSIONS.REPORTS_TRANSACTION_HISTORY,
      },
      {
        id: "reports-expense-analysis",
        label: "Expense analysis",
        href: "/reports/expense-analysis",
        keywords: ["expense", "totals", "export"],
        requiredPermission: NAV_PERMISSIONS.REPORTS_EXPENSE_ANALYSIS,
      },
      {
        id: "reports-liability",
        label: "Liability",
        href: "/reports/liability",
        keywords: ["receivable", "payable", "ledger"],
        requiredPermission: NAV_PERMISSIONS.LIABILITY_REPORT_VIEW,
      },
    ],
  },
  {
    id: "user-history",
    label: "Login history",
    href: "/user-history",
    keywords: ["audit", "login"],
    requiredPermission: NAV_PERMISSIONS.USER_HISTORY_VIEW,
  },
];
