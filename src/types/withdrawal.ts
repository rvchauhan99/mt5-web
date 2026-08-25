export type WithdrawalView = "exchange" | "banker" | "final";

export type WithdrawalStatus = "requested" | "approved" | "rejected" | "finalized";

export type WithdrawalPayoutSettlementType = "bank" | "person";

export type WithdrawalBankerPayoutInput =
  | { payoutSettlementType: "bank"; bankId: string; utr: string }
  | { payoutSettlementType: "person"; liabilityPersonId: string; utr: string };

export type WithdrawalCreateInput = {
  playerId: string;
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  ifsc: string;
  amount: number;
  reverseBonus?: number;
  requestedAt?: string;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
};

export type WithdrawalAmendmentSnapshot = {
  amount?: number;
  reverseBonus?: number;
  payableAmount?: number;
  payoutBankId?: string;
  payoutBankName?: string;
  payoutLiabilityPersonId?: string;
  payoutLiabilityPersonName?: string;
  utr?: string;
};

export type WithdrawalAmendmentEntry = {
  at: string;
  by?: unknown;
  reason: string;
  old: WithdrawalAmendmentSnapshot;
  new: WithdrawalAmendmentSnapshot;
};

export type WithdrawalAmendInput = {
  amount: number;
  reverseBonus: number;
  /** Required when amending bank-settled payouts; omit for liability-person settlement. */
  payoutBankId?: string;
  utr: string;
  requestedAt?: string;
  reasonId: string;
  remark?: string;
};

export type WithdrawalRow = {
  _id: string;
  id: string;
  playerName: string;
  player?: unknown;
  accountNumber?: string;
  accountHolderName?: string;
  bankName: string;
  ifsc?: string;
  amount: number;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  reverseBonus?: number;
  payableAmount?: number;
  payoutSettlementType?: WithdrawalPayoutSettlementType;
  payoutLiabilityPersonId?: string;
  payoutLiabilityPersonName?: string;
  payoutBankId?: string;
  payoutBankName?: string;
  utr?: string;
  requestedAt?: string;
  status: WithdrawalStatus;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  amendmentCount?: number;
  lastAmendedAt?: string;
  lastAmendedBy?: unknown;
  lastAmendedByName?: string;
  amendmentHistory?: WithdrawalAmendmentEntry[];
};

export type SavedWithdrawalAccount = {
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  ifsc: string;
};

export type WithdrawalImportJobSummary = {
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

export type BulkBankerApproveResult = {
  approved: number;
  failed: Array<{ withdrawalId: string; error: string }>;
};

export type WithdrawalBulkApproveJobSummary = {
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
  errorSample: Array<{ withdrawalId: string; error: string }>;
};
