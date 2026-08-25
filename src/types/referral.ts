export type ReferralAccrualStatus = "accrued" | "settled" | "cancelled";

export type ReferralAccrualRow = {
  _id: string;
  referrerPlayerId:
    | string
    | { _id?: string; playerId?: string; phone?: string; exchange?: { _id?: string; name?: string; provider?: string } };
  referredPlayerId:
    | string
    | { _id?: string; playerId?: string; phone?: string; exchange?: { _id?: string; name?: string; provider?: string } };
  exchangeId: string | { _id?: string; name?: string; provider?: string };
  sourceDepositId: string | { _id?: string; utr?: string; amount?: number; status?: string; entryAt?: string };
  sourceDepositAmount: number;
  referralPercentage: number;
  accruedAmount: number;
  status: ReferralAccrualStatus;
  settledAt?: string;
  settlementDepositId?: string | { _id?: string; utr?: string; amount?: number; entryAt?: string };
  cancelledReason?: string;
  createdAt?: string;
};
