export type DepositView = "banker" | "exchange" | "final";

export type DepositStatus = "pending" | "not_settled" | "verified" | "rejected" | "finalized";

export type DepositSettlementAccountType = "bank" | "person";

export type DepositCreateInput =
  | {
      settlementAccountType: "bank";
      bankId: string;
      utr: string;
      amount: number;
      operatedCurrency?: string;
      operatedAmount?: number;
      exchangeRate?: number;
      entryAt?: string;
      playerId: string;
      bonusAmount: number;
    }
  | {
      settlementAccountType: "person";
      liabilityPersonId: string;
      utr: string;
      amount: number;
      operatedCurrency?: string;
      operatedAmount?: number;
      exchangeRate?: number;
      entryAt?: string;
      playerId: string;
      bonusAmount: number;
    };

/** Pending-only update payload (legacy pending rows). */
export type DepositUpdateInput =
  | {
      settlementAccountType: "bank";
      bankId: string;
      utr: string;
      amount: number;
      operatedCurrency?: string;
      operatedAmount?: number;
      exchangeRate?: number;
      entryAt?: string;
    }
  | {
      settlementAccountType: "person";
      liabilityPersonId: string;
      utr: string;
      amount: number;
      operatedCurrency?: string;
      operatedAmount?: number;
      exchangeRate?: number;
      entryAt?: string;
    };

export type DepositAmendmentSnapshot = {
  bankId?: string;
  bankName?: string;
  liabilityPersonId?: string;
  liabilityPersonName?: string;
  utr?: string;
  amount?: number;
  playerId?: string;
  bonusAmount?: number;
  totalAmount?: number;
};

export type DepositAmendmentEntry = {
  at: string;
  by?: unknown;
  reason: string;
  old: DepositAmendmentSnapshot;
  new: DepositAmendmentSnapshot;
};

export type DepositRow = {
  _id: string;
  id: string;
  settlementAccountType?: DepositSettlementAccountType;
  bankId?: string;
  bankName: string;
  liabilityPersonId?: string;
  liabilityPersonName?: string;
  utr: string;
  amount: number;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  status: DepositStatus;
  stage?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: unknown;
  createdByName?: string;
  bankId_populated?: unknown;
  player?: unknown;
  /** MongoDB ObjectId string for API (from populated `player`). */
  playerMongoId?: string;
  playerIdLabel?: string;
  bonusAmount?: number;
  totalAmount?: number;
  rejectReason?: string;
  exchangeActionBy?: unknown;
  exchangeActionByName?: string;
  exchangeActionAt?: string;
  bankBalanceAfter?: number;
  entryAt?: string;
  settledAt?: string;
  amendmentCount?: number;
  lastAmendedAt?: string;
  lastAmendedBy?: unknown;
  lastAmendedByName?: string;
  amendmentHistory?: DepositAmendmentEntry[];
};

export type DepositAmendInput = {
  /** Required when amending bank-settled deposits; omit for liability-person settlement. */
  bankId?: string;
  utr: string;
  amount: number;
  playerId: string;
  bonusAmount: number;
  entryAt?: string;
  reasonId: string;
  remark?: string;
};

export type DepositBulkExchangeApproveJobSummary = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  failureReason?: string;
  progress: {
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
  };
  errorSample: Array<{ depositId: string; error: string }>;
};

export type DepositImportJobSummary = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  failureReason?: string;
  progress: {
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    skippedRows: number;
  };
  errorSample: Array<{ row: number; utr: string; error: string }>;
  errorCsvAvailable: boolean;
};
