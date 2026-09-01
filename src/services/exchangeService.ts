import { apiClient } from "@/services/apiClient";
import {
  Exchange,
  ExchangeCreateInput,
  ExchangeListParams,
  ExchangeListResult,
  ExchangeStatementEntryType,
  ExchangeStatementResponse,
  ExchangeTopupRow,
  ExchangeStatus,
} from "@/types/exchange";

function toOptionalParam(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

function parseAuditUser(
  value: unknown,
): {
  id?: string;
  name?: string;
} {
  if (typeof value === "string") return { id: value };
  if (!value || typeof value !== "object") return {};

  const row = value as Record<string, unknown>;
  const idRaw = row.id ?? row._id;
  const id = typeof idRaw === "string" ? idRaw : undefined;
  const nameCandidate = [row.fullName, row.full_name, row.username, row.name].find(
    (entry) => typeof entry === "string" && String(entry).trim() !== "",
  );
  const name = typeof nameCandidate === "string" ? nameCandidate : undefined;
  return { id, name };
}

const mockRows: Exchange[] = [
  {
    id: "EX-101",
    _id: "EX-101",
    name: "E2E",
    openingBalance: 300,
    bonus: 0,
    provider: "Provider A",
    status: "active",
    version: 1,
    createdBy: "system",
    updatedBy: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function normalizeExchange(row: Partial<Exchange> & { _id?: string; id?: string }): Exchange {
  const id = row.id ?? row._id ?? "";
  const createdByUser = parseAuditUser(row.createdBy);
  const updatedByUser = parseAuditUser(row.updatedBy);
  const createdByName = toOptionalParam(
    row.createdByName ?? row["created_by_name" as keyof typeof row] ?? createdByUser.name,
  );
  const updatedByName = toOptionalParam(
    row.updatedByName ?? row["updated_by_name" as keyof typeof row] ?? updatedByUser.name,
  );
  return {
    id,
    _id: row._id ?? id,
    name: row.name ?? "",
    openingBalance: Number(row.openingBalance ?? 0),
    currentBalance:
      row.currentBalance != null
        ? Number(row.currentBalance)
        : row.openingBalance != null
          ? Number(row.openingBalance)
          : 0,
    bonus: Number(row.bonus ?? 0),
    provider: row.provider ?? "",
    status: (row.status ?? "deactive") as Exchange["status"],
    version: row.version,
    createdBy: toOptionalParam(createdByUser.id ?? row.createdBy),
    createdByName,
    updatedBy: toOptionalParam(updatedByUser.id ?? row.updatedBy),
    updatedByName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type RawExchangeListResponse = {
  data?: unknown;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
};

export async function listExchanges(params: ExchangeListParams = {}): Promise<ExchangeListResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? params.pageSize ?? 20;
  const textSearch = params.q ?? params.search ?? "";
  const sortBy = params.sortBy ?? "createdAt";
  const sortOrder = params.sortOrder ?? "desc";
  const requestParams = {
    page,
    pageSize: limit,
    search: textSearch || undefined,
    sortBy,
    sortOrder,
    name: toOptionalParam(params.name),
    name_op: toOptionalParam(params.nameOp),
    provider: toOptionalParam(params.provider),
    provider_op: toOptionalParam(params.providerOp),
    status: toOptionalParam(params.status),
    createdBy: toOptionalParam(params.createdBy),
    updatedBy: toOptionalParam(params.updatedBy),
    createdAt_from: toOptionalParam(params.createdAtFrom),
    createdAt_to: toOptionalParam(params.createdAtTo),
    createdAt_op: toOptionalParam(params.createdAtOp),
    openingBalance: toOptionalParam(params.openingBalance),
    openingBalance_to: toOptionalParam(params.openingBalanceTo),
    openingBalance_op: toOptionalParam(params.openingBalanceOp),
    currentBalance: toOptionalParam(params.currentBalance),
    currentBalance_to: toOptionalParam(params.currentBalanceTo),
    currentBalance_op: toOptionalParam(params.currentBalanceOp),
    bonus: toOptionalParam(params.bonus),
    bonus_to: toOptionalParam(params.bonusTo),
    bonus_op: toOptionalParam(params.bonusOp),
  };

  try {
    const response = await apiClient.get<RawExchangeListResponse>("/exchange", { params: requestParams });
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    const total = Number(response.data?.meta?.total ?? rows.length);
    const responsePage = Number(response.data?.meta?.page ?? page);
    const responsePageSize = Number(response.data?.meta?.pageSize ?? limit);
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, responsePageSize)));

    return {
      items: rows.map((row) => normalizeExchange(row as Partial<Exchange> & { _id?: string; id?: string })),
      meta: {
        page: responsePage,
        pageSize: responsePageSize,
        total,
        totalPages,
      },
    };
  } catch {
    const total = mockRows.length;

    return {
      items: mockRows.map(normalizeExchange),
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
      },
    };
  }
}

function str(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (v === undefined || v === null) return "";
  return String(v);
}

/**
 * Flat fetcher params (URL/snake_case keys) → API list, normalized to `{ data, meta }` for PaginatedTableReference.
 */
export async function listExchangesNormalized(
  params: Record<string, unknown>,
): Promise<{ data: Exchange[]; meta: { total: number; page: number; pageSize: number } }> {
  const statusRaw = str(params, "status");
  const status: ExchangeStatus | undefined =
    statusRaw === "active" || statusRaw === "deactive" ? statusRaw : undefined;

  const result = await listExchanges({
    page: Number(params.page) || 1,
    limit: Number(params.limit) || 20,
    q: str(params, "q") || undefined,
    sortBy: (str(params, "sortBy") || "createdAt") as ExchangeListParams["sortBy"],
    sortOrder: str(params, "sortOrder") === "asc" ? "asc" : "desc",
    name: str(params, "name"),
    nameOp: str(params, "name_op") || undefined,
    provider: str(params, "provider"),
    providerOp: str(params, "provider_op") || undefined,
    status,
    createdBy: str(params, "createdBy"),
    updatedBy: str(params, "updatedBy"),
    createdAtFrom: str(params, "createdAt_from"),
    createdAtTo: str(params, "createdAt_to"),
    createdAtOp: str(params, "createdAt_op") || undefined,
    openingBalance: str(params, "openingBalance"),
    openingBalanceTo: str(params, "openingBalance_to"),
    openingBalanceOp: str(params, "openingBalance_op") || undefined,
    currentBalance: str(params, "currentBalance"),
    currentBalanceTo: str(params, "currentBalance_to"),
    currentBalanceOp: str(params, "currentBalance_op") || undefined,
    bonus: str(params, "bonus"),
    bonusTo: str(params, "bonus_to"),
    bonusOp: str(params, "bonus_op") || undefined,
  });

  return {
    data: result.items,
    meta: {
      total: result.meta.total,
      page: result.meta.page,
      pageSize: result.meta.pageSize,
    },
  };
}

/**
 * Download filtered exchange list as Excel (same query contract as list).
 * Pagination fields are ignored by the API for export row selection.
 */
export async function exportExchanges(params: ExchangeListParams = {}): Promise<Blob> {
  const textSearch = params.q ?? params.search ?? "";
  const sortBy = params.sortBy ?? "createdAt";
  const sortOrder = params.sortOrder ?? "desc";
  const requestParams = {
    search: textSearch || undefined,
    sortBy,
    sortOrder,
    name: toOptionalParam(params.name),
    name_op: toOptionalParam(params.nameOp),
    provider: toOptionalParam(params.provider),
    provider_op: toOptionalParam(params.providerOp),
    status: toOptionalParam(params.status),
    createdBy: toOptionalParam(params.createdBy),
    updatedBy: toOptionalParam(params.updatedBy),
    createdAt_from: toOptionalParam(params.createdAtFrom),
    createdAt_to: toOptionalParam(params.createdAtTo),
    createdAt_op: toOptionalParam(params.createdAtOp),
    openingBalance: toOptionalParam(params.openingBalance),
    openingBalance_to: toOptionalParam(params.openingBalanceTo),
    openingBalance_op: toOptionalParam(params.openingBalanceOp),
    currentBalance: toOptionalParam(params.currentBalance),
    currentBalance_to: toOptionalParam(params.currentBalanceTo),
    currentBalance_op: toOptionalParam(params.currentBalanceOp),
    bonus: toOptionalParam(params.bonus),
    bonus_to: toOptionalParam(params.bonusTo),
    bonus_op: toOptionalParam(params.bonusOp),
  };

  const response = await apiClient.get("/exchange/export", {
    params: requestParams,
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function createExchange(input: ExchangeCreateInput): Promise<Exchange> {
  try {
    const response = await apiClient.post("/exchange", input);
    return response.data?.data;
  } catch {
    return {
      id: `EX-${Math.floor(Math.random() * 10000)}`,
      ...input,
    };
  }
}

export async function getExchangeStatement(
  exchangeId: string,
  query?: {
    fromDate?: string;
    toDate?: string;
    playerId?: string;
    entryType?: ExchangeStatementEntryType;
  },
): Promise<ExchangeStatementResponse> {
  const res = await apiClient.get<{ success: boolean; data: ExchangeStatementResponse }>(
    `/exchange/${encodeURIComponent(exchangeId)}/statement`,
    { params: query },
  );
  return res.data.data;
}

export async function createExchangeTopup(input: {
  exchangeId: string;
  amount: number;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  remark?: string;
}): Promise<ExchangeTopupRow & { currentBalance?: number }> {
  const res = await apiClient.post<{ success: boolean; data: ExchangeTopupRow & { currentBalance?: number } }>(
    "/exchange-topup",
    input,
  );
  return res.data.data;
}

export async function listExchangeTopups(params?: {
  exchangeId?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: "asc" | "desc";
}): Promise<{ items: ExchangeTopupRow[]; meta: { page: number; pageSize: number; total: number } }> {
  const response = await apiClient.get<{
    success: boolean;
    data: ExchangeTopupRow[];
    meta: { page: number; pageSize: number; total: number };
  }>("/exchange-topup", {
    params: {
      exchangeId: params?.exchangeId,
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      sortOrder: params?.sortOrder ?? "desc",
    },
  });
  return {
    items: response.data.data ?? [],
    meta: response.data.meta ?? { page: 1, pageSize: 20, total: 0 },
  };
}

export async function exportExchangeTopups(params?: {
  exchangeId?: string;
  sortOrder?: "asc" | "desc";
}): Promise<Blob> {
  const response = await apiClient.get("/exchange-topup/export", {
    params: {
      exchangeId: params?.exchangeId,
      sortOrder: params?.sortOrder ?? "desc",
    },
    responseType: "blob",
  });
  return response.data;
}
