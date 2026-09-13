export type BalanceSheetSide = "asset" | "liability";

export type BalanceSheetLedgerType =
  | "bank"
  | "exchange"
  | "person"
  | "player"
  | "expense"
  | "referral"
  | "withdrawal"
  | "deposit"
  | "manual"
  | "computed";

export type BalanceSheetCompareMode = "none" | "prior_period" | "yoy" | "qoq";

export interface BalanceSheetLedger {
  ledgerId: string;
  name: string;
  type: BalanceSheetLedgerType;
  openingBalance: number;
  periodDebits: number;
  periodCredits: number;
  closingBalance: number;
  side: BalanceSheetSide;
  groupCode: string;
  compareClosingBalance?: number | null;
  compareDelta?: number | null;
}

export interface BalanceSheetGroupNode {
  groupId: string;
  code: string;
  name: string;
  parentGroupId: string | null;
  parentCode: string | null;
  side: BalanceSheetSide;
  level: number;
  sortOrder: number;
  ledgers: BalanceSheetLedger[];
  subGroups: BalanceSheetGroupNode[];
  total: number;
  compareTotal?: number | null;
  compareDelta?: number | null;
}

export interface BalanceSheetTotals {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  grossPL: number;
  netPL: number;
  compareTotalAssets?: number | null;
  compareTotalLiabilities?: number | null;
  compareTotalEquity?: number | null;
}

export interface BalanceSheetMeta {
  fromDate: string;
  toDate: string;
  exchangeId: string | null;
  timeZone: string;
  currency: string;
  compare: string;
  compareFromDate: string | null;
  compareToDate: string | null;
  showZeroBalances: boolean;
  isBalanced: boolean;
  difference: number;
}

export interface BalanceSheetData {
  meta: BalanceSheetMeta;
  totals: BalanceSheetTotals;
  assets: BalanceSheetGroupNode[];
  liabilities: BalanceSheetGroupNode[];
  equity: BalanceSheetGroupNode[];
}

export interface BalanceSheetQueryParams {
  fromDate: string;
  toDate: string;
  exchangeId?: string;
  groupId?: string;
  groupCode?: string;
  showZeroBalances?: boolean;
  includeSubGroups?: boolean;
  currency?: string;
  compare?: BalanceSheetCompareMode;
}

export interface BalanceSheetDrilldownRow {
  type: string;
  date: string;
  amount: number;
  direction: "in" | "out" | string;
  reference?: string;
  status?: string;
}

export interface BalanceSheetGroupOption {
  groupId: string;
  code: string;
  name: string;
  parentGroupId: string | null;
  parentCode: string | null;
  side: BalanceSheetSide;
  level: number;
  sortOrder: number;
}
