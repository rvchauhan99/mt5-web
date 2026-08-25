import { apiClient } from "./apiClient";
import type { ReasonType } from "@/lib/constants/reasonTypes";

export type ReasonOption = {
  id: string;
  reason: string;
  reasonType: string;
};

export async function listReasonOptions(reasonType: ReasonType): Promise<ReasonOption[]> {
  const res = await apiClient.get<{ success: boolean; data: ReasonOption[] }>("/reasons/options", {
    params: { reasonType, limit: 200 },
  });
  const data = res.data?.data;
  return Array.isArray(data) ? data : [];
}
