import { apiClient } from "./apiClient";

export type LookupBankOption = {
  id: string;
  label: string;
  method?: string;
  holderName: string;
  bankName: string;
  accountNumber: string;
};

export type LookupExpenseTypeOption = {
  id: string;
  label: string;
  name: string;
  code?: string;
  description?: string;
  /** False only when master `auditRequired` is explicitly false (auto-approve + settlement on create). */
  requiresAudit: boolean;
  auditNotRequired: boolean;
};

export type LookupPlayerOption = {
  id: string;
  label: string;
  playerId: string;
  phone: string;
  exchangeId?: string;
  exchangeName: string;
  exchangeProvider: string;
};

export type LookupPlayerBonusProfile = {
  id: string;
  playerId: string;
  regularBonusPercentage: number;
  firstDepositBonusPercentage: number;
};

export type LookupExchangeOption = {
  id: string;
  label: string;
  name: string;
  provider: string;
  status: string;
};

type LookupListParams = {
  q?: string;
  limit?: number;
  /** Exact expense type id (24-char hex); resolves audit flags outside list pagination. */
  id?: string;
  /** Player lookup only; restrict results to trader or ib. */
  userType?: "trader" | "ib";
};

type NormalizedLookupQuery = {
  q: string;
  limit: number;
  id?: string;
  userType?: "trader" | "ib";
};

function normalizeQueryParams(params?: LookupListParams): NormalizedLookupQuery {
  const idTrim = params?.id?.trim();
  const userType = params?.userType === "trader" || params?.userType === "ib" ? params.userType : undefined;
  return {
    q: params?.q?.trim() || "",
    limit: Number(params?.limit) > 0 ? Number(params?.limit) : 20,
    ...(idTrim && /^[a-f0-9]{24}$/i.test(idTrim) ? { id: idTrim } : {}),
    ...(userType ? { userType } : {}),
  };
}

export async function listBankLookupOptions(params?: LookupListParams): Promise<LookupBankOption[]> {
  const query = normalizeQueryParams(params);
  const res = await apiClient.get<{ success: boolean; data: LookupBankOption[] }>("/lookup/banks", {
    params: { q: query.q || undefined, limit: query.limit },
  });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function listExpenseTypeLookupOptions(
  params?: LookupListParams,
): Promise<LookupExpenseTypeOption[]> {
  const query = normalizeQueryParams(params);
  const res = await apiClient.get<{ success: boolean; data: LookupExpenseTypeOption[] }>(
    "/lookup/expense-types",
    {
      params: {
        q: query.q || undefined,
        limit: query.limit,
        ...(query.id ? { id: query.id } : {}),
      },
    },
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function listPlayerLookupOptions(params?: LookupListParams): Promise<LookupPlayerOption[]> {
  const query = normalizeQueryParams(params);
  const res = await apiClient.get<{ success: boolean; data: LookupPlayerOption[] }>("/lookup/players", {
    params: {
      q: query.q || undefined,
      limit: query.limit,
      ...(query.userType ? { userType: query.userType } : {}),
    },
  });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function listExchangeLookupOptions(
  params?: LookupListParams,
): Promise<LookupExchangeOption[]> {
  const query = normalizeQueryParams(params);
  const res = await apiClient.get<{ success: boolean; data: LookupExchangeOption[] }>(
    "/lookup/exchanges",
    {
      params: { q: query.q || undefined, limit: query.limit },
    },
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function getPlayerBonusProfile(
  playerId: string,
): Promise<LookupPlayerBonusProfile> {
  const res = await apiClient.get<{ success: boolean; data: LookupPlayerBonusProfile }>(
    `/lookup/players/${encodeURIComponent(playerId)}/bonus-profile`,
  );
  return (
    res.data?.data ?? {
      id: playerId,
      playerId: "",
      regularBonusPercentage: 0,
      firstDepositBonusPercentage: 0,
    }
  );
}

export type LookupExchangeRateResult = {
  rate: number | null;
  source: "direct" | "reverse" | null;
};

export async function lookupExchangeRate(
  from: string,
  to: string,
): Promise<LookupExchangeRateResult> {
  const res = await apiClient.get<{ success: boolean; data: LookupExchangeRateResult }>(
    "/lookup/exchange-rate",
    { params: { from, to } },
  );
  return res.data?.data ?? { rate: null, source: null };
}

