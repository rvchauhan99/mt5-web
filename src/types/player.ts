export type PlayerRow = {
  _id: string;
  id?: string;
  exchange: string | { _id?: string; name?: string; provider?: string };
  playerId: string;
  phone: string;
  regularBonusPercentage: number;
  firstDepositBonusPercentage: number;
  referredByPlayerId?: string | { _id?: string; playerId?: string; phone?: string };
  referralPercentage?: number;
  bonusPercentage?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: unknown;
  createdByName?: string;
  updatedBy?: unknown;
};

export type PlayerCreateInput = {
  exchangeId: string;
  playerId: string;
  phone: string;
  regularBonusPercentage: number;
  firstDepositBonusPercentage: number;
  referredByPlayerId?: string | null;
  referralPercentage?: number;
};

export type PlayerUpdateInput = {
  phone: string;
  regularBonusPercentage: number;
  firstDepositBonusPercentage: number;
  referredByPlayerId?: string | null;
  referralPercentage?: number;
};

export type PlayerDetail = Pick<
  PlayerRow,
  | "exchange"
  | "playerId"
  | "phone"
  | "regularBonusPercentage"
  | "firstDepositBonusPercentage"
  | "referredByPlayerId"
  | "referralPercentage"
  | "bonusPercentage"
>;

export type PlayerImportResult = {
  created: number;
  updated: number;
  skipped: number;
};

export type PlayerImportJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type PlayerImportJobProgress = {
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
};

export type PlayerImportJobSummary = {
  id: string;
  status: PlayerImportJobStatus;
  fileName: string;
  failureReason?: string;
  progress: PlayerImportJobProgress;
  errorSample: Array<{
    row: number;
    message: string;
    reason?: string;
    rowData?: {
      exchange_name: string;
      player_id: string;
      phone: string;
      bonus_percentage: string;
      first_deposit_bonus_percentage: string;
    };
  }>;
  errorCsvAvailable?: boolean;
};
