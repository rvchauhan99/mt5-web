export type ReferralAccrualStatus = "accrued" | "settled" | "cancelled";
export type ReferralSettlementAccountType = "bank" | "person";

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
  settlementAccountType?: ReferralSettlementAccountType;
  bankId?: string;
  bankName?: string;
  liabilityPersonId?: string;
  liabilityPersonName?: string;
  liabilityEntryId?: string;
  settlementRemark?: string;
  bankBalanceAfter?: number;
  cancelledReason?: string;
  createdAt?: string;
};

export type SettleReferralAccrualsInput =
  | {
      accrualIds: string[];
      remark?: string;
      settlementAccountType: "bank";
      bankId: string;
    }
  | {
      accrualIds: string[];
      remark?: string;
      settlementAccountType: "person";
      liabilityPersonId: string;
    };

export type SettleReferralAccrualsResult = {
  settledAccrualCount: number;
  totalAmount: number;
  settlementAccountType: ReferralSettlementAccountType;
  bankId?: string;
  bankBalanceAfter?: number;
  liabilityPersonId?: string;
  liabilityEntryId?: string;
};
