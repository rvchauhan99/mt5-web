import { apiClient } from "@/services/apiClient";
import type { ReferralAccrualRow, ReferralAccrualStatus } from "@/types/referral";

type ListReferralAccrualParams = {
  page?: number;
  pageSize?: number;
  status?: ReferralAccrualStatus;
  referrerPlayerId?: string;
  referredPlayerId?: string;
  exchangeId?: string;
};

type ListReferralAccrualResponse = {
  success: boolean;
  data: ReferralAccrualRow[];
  meta: { total: number; page: number; pageSize: number };
};

export async function listReferralAccruals(params: ListReferralAccrualParams): Promise<{
  data: ReferralAccrualRow[];
  meta: { total: number; page: number; pageSize: number };
}> {
  const response = await apiClient.get<ListReferralAccrualResponse>("/referral/accruals", {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      status: params.status || undefined,
      referrerPlayerId: params.referrerPlayerId || undefined,
      referredPlayerId: params.referredPlayerId || undefined,
      exchangeId: params.exchangeId || undefined,
    },
  });

  return {
    data: Array.isArray(response.data?.data) ? response.data.data : [],
    meta: response.data?.meta ?? { total: 0, page: 1, pageSize: 20 },
  };
}

export async function settleReferralAccruals(input: {
  accrualIds: string[];
  remark?: string;
}): Promise<{ settlementDepositId: string; settledAccrualCount: number; totalAmount: number }> {
  const response = await apiClient.post<{
    success: boolean;
    data: { settlementDepositId: string; settledAccrualCount: number; totalAmount: number };
  }>("/referral/settle", input);
  return response.data.data;
}
