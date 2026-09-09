export type LiabilityViewMode = "platform" | "person";
export type LiabilityBalanceSide = "receivable" | "payable" | "settled";

export type LiabilityOpeningKind = "payable" | "receivable";

export type LiabilityPersonRow = {
  _id: string;
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
  openingBalance: number;
  openingOperatedCurrency?: string;
  openingOperatedAmount?: number;
  openingExchangeRate?: number;
  openingBalanceAbs: number;
  openingBalanceSide: LiabilityBalanceSide;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  closingBalanceAbs: number;
  closingBalanceSide: LiabilityBalanceSide;
  createdAt?: string;
  updatedAt?: string;
  createdByName?: string;
  updatedByName?: string;
};

export type LiabilityEntryType = "receipt" | "payment" | "contra" | "journal";
export type LiabilityAccountType = "bank" | "person" | "expense" | "deposit" | "withdrawal" | "referral";
export type LiabilityEntrySourceType = "expense" | "deposit" | "withdrawal" | "referral";

export type LiabilityEntryRow = {
  _id: string;
  id: string;
  entryDate?: string;
  entryType: LiabilityEntryType;
  amount: number;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  fromAccountType: LiabilityAccountType;
  fromAccountId: string;
  fromAccountName?: string;
  toAccountType: LiabilityAccountType;
  toAccountId: string;
  toAccountName?: string;
  sourceType?: LiabilityEntrySourceType;
  sourceExpenseId?: string;
  sourceDepositId?: string;
  sourceWithdrawalId?: string;
  sourceReferralAccrualId?: string;
  referenceNo?: string;
  remark?: string;
  createdAt?: string;
  createdByName?: string;
};

export type LiabilityPersonCreateInput = {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  /** Legacy signed value; ignored by API when openingAmount is sent. */
  openingBalance?: number;
  openingAmount?: number;
  openingKind?: LiabilityOpeningKind;
  openingOperatedCurrency?: string;
  openingOperatedAmount?: number;
  openingExchangeRate?: number;
  isActive?: boolean;
};

export type LiabilityPersonUpdateInput = Partial<LiabilityPersonCreateInput>;

export type LiabilityEntryCreateInput = {
  entryDate: string;
  entryType: LiabilityEntryType;
  amount: number;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  fromAccountType: LiabilityAccountType;
  fromAccountId: string;
  toAccountType: LiabilityAccountType;
  toAccountId: string;
  referenceNo?: string;
  remark?: string;
};

/** Settlement amend may omit legs; server keeps existing from/to and source links. */
export type LiabilityEntryUpdateInput = {
  entryDate: string;
  entryType?: LiabilityEntryType;
  amount: number;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  fromAccountType?: LiabilityAccountType;
  fromAccountId?: string;
  toAccountType?: LiabilityAccountType;
  toAccountId?: string;
  referenceNo?: string;
  remark?: string;
};

export type LiabilityLedgerRow = {
  _id: string;
  at: string;
  entryType: string;
  from: string;
  to: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceAbs: number;
  runningBalanceSide: LiabilityBalanceSide;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  referenceNo?: string;
  remark?: string;
};

export type LiabilityOperatedCurrencyBreakdown = {
  currency: string;
  creditOperated: number;
  debitOperated: number;
  creditPlatform: number;
  debitPlatform: number;
};

export type LiabilityLedgerResponse = {
  viewMode?: LiabilityViewMode;
  person: {
    _id: string;
    name: string;
    openingBalance: number;
    openingBalanceAbs: number;
    openingSide?: LiabilityBalanceSide;
  };
  rows: LiabilityLedgerRow[];
  /** Full-history closing (all entries), regardless of date filter. */
  closingBalance: number;
  closingSide?: LiabilityBalanceSide;
  periodOpeningBalance: number;
  periodOpeningBalanceAbs: number;
  periodOpeningSide: LiabilityBalanceSide;
  periodClosingBalance: number;
  periodClosingBalanceAbs: number;
  periodClosingSide: LiabilityBalanceSide;
  operatedCurrencyBreakdown?: LiabilityOperatedCurrencyBreakdown[];
};

export type LiabilitySummaryReport = {
  viewMode?: LiabilityViewMode;
  totalReceivable: number;
  totalPayable: number;
  netPosition: number;
  netPositionAbs?: number;
  netPositionSide?: LiabilityBalanceSide;
  totalPersons: number;
};

export type LiabilityPersonWiseReportRow = {
  personId: string;
  name: string;
  isActive: boolean;
  balance: number;
  balanceAbs: number;
  totalCredits?: number;
  totalDebits?: number;
  side: "receivable" | "payable";
  sideLabel?: LiabilityBalanceSide;
  viewMode?: LiabilityViewMode;
};
