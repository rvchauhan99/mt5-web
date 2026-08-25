import { apiClient } from "./apiClient";
import type {
  LiabilityBalanceSide,
  LiabilityEntryCreateInput,
  LiabilityEntryRow,
  LiabilityLedgerResponse,
  LiabilityLedgerRow,
  LiabilityPersonCreateInput,
  LiabilityPersonRow,
  LiabilityPersonUpdateInput,
  LiabilityPersonWiseReportRow,
  LiabilitySummaryReport,
  LiabilityViewMode,
} from "@/types/liability";
import { liabilitySideFromSigned } from "@/lib/liabilityDisplay";

function toOptionalParam(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

function str(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (v === undefined || v === null) return "";
  return String(v);
}

function parseUserName(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const fullName = String(row.fullName ?? "").trim();
  const username = String(row.username ?? "").trim();
  if (fullName && username) return `${fullName} (${username})`;
  return fullName || username || undefined;
}

function normalizePerson(row: Record<string, unknown>): LiabilityPersonRow {
  const id = String(row._id ?? row.id ?? "");
  const openingBalance = Number(row.openingBalance ?? 0);
  const closingBalance = Number(row.closingBalance ?? row.openingBalance ?? 0);
  const openingBalanceAbs =
    row.openingBalanceAbs != null ? Number(row.openingBalanceAbs) : Math.abs(openingBalance);
  const closingBalanceAbs =
    row.closingBalanceAbs != null ? Number(row.closingBalanceAbs) : Math.abs(closingBalance);
  const openingBalanceSide =
    (row.openingBalanceSide as LiabilityBalanceSide | undefined) ?? liabilitySideFromSigned(openingBalance);
  const closingBalanceSide =
    (row.closingBalanceSide as LiabilityBalanceSide | undefined) ?? liabilitySideFromSigned(closingBalance);
  return {
    _id: id,
    id,
    name: String(row.name ?? ""),
    phone: String(row.phone ?? "").trim() || undefined,
    email: String(row.email ?? "").trim() || undefined,
    notes: String(row.notes ?? "").trim() || undefined,
    isActive: Boolean(row.isActive ?? true),
    openingBalance,
    openingBalanceAbs,
    openingBalanceSide,
    totalDebits: Number(row.totalDebits ?? 0),
    totalCredits: Number(row.totalCredits ?? 0),
    closingBalance,
    closingBalanceAbs,
    closingBalanceSide,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : undefined,
    createdByName: parseUserName(row.createdBy),
    updatedByName: parseUserName(row.updatedBy),
  };
}

function normalizeEntry(row: Record<string, unknown>): LiabilityEntryRow {
  const id = String(row._id ?? row.id ?? "");
  return {
    _id: id,
    id,
    entryDate: row.entryDate != null ? String(row.entryDate).slice(0, 10) : undefined,
    entryType: (row.entryType as LiabilityEntryRow["entryType"]) ?? "journal",
    amount: Number(row.amount ?? 0),
    fromAccountType: (row.fromAccountType as LiabilityEntryRow["fromAccountType"]) ?? "person",
    fromAccountId: String(row.fromAccountId ?? ""),
    fromAccountName: String(row.fromAccountName ?? "").trim() || undefined,
    toAccountType: (row.toAccountType as LiabilityEntryRow["toAccountType"]) ?? "person",
    toAccountId: String(row.toAccountId ?? ""),
    toAccountName: String(row.toAccountName ?? "").trim() || undefined,
    sourceType: row.sourceType === "expense" ? "expense" : undefined,
    sourceExpenseId: row.sourceExpenseId != null ? String(row.sourceExpenseId) : undefined,
    referenceNo: String(row.referenceNo ?? "").trim() || undefined,
    remark: String(row.remark ?? "").trim() || undefined,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    createdByName: parseUserName(row.createdBy),
  };
}

export async function createLiabilityPerson(input: LiabilityPersonCreateInput): Promise<unknown> {
  const res = await apiClient.post<{ success: boolean; data: unknown }>("/liability/persons", input);
  return res.data?.data;
}

export async function updateLiabilityPerson(id: string, input: LiabilityPersonUpdateInput): Promise<unknown> {
  const res = await apiClient.patch<{ success: boolean; data: unknown }>(`/liability/persons/${id}`, input);
  return res.data?.data;
}

export async function listLiabilityPersonsNormalized(params: Record<string, unknown>): Promise<{
  data: LiabilityPersonRow[];
  meta: { total: number; page: number; pageSize: number };
}> {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const sortBy = (str(params, "sortBy") || "createdAt") as
    | "createdAt"
    | "name"
    | "openingBalance"
    | "isActive";
  const sortOrder = str(params, "sortOrder") === "asc" ? "asc" : "desc";

  const response = await apiClient.get<{
    success: boolean;
    data: Record<string, unknown>[];
    meta: { total: number; page: number; pageSize: number };
  }>("/liability/persons", {
    params: {
      page,
      pageSize: limit,
      sortBy,
      sortOrder,
      search: toOptionalParam(str(params, "q")) || undefined,
      isActive: toOptionalParam(str(params, "isActive")),
    },
  });

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const meta = response.data?.meta;
  return {
    data: rows.map((row) => normalizePerson(row)),
    meta: {
      total: Number(meta?.total ?? 0),
      page: Number(meta?.page ?? page),
      pageSize: Number(meta?.pageSize ?? limit),
    },
  };
}

export async function createLiabilityEntry(input: LiabilityEntryCreateInput): Promise<unknown> {
  const res = await apiClient.post<{ success: boolean; data: unknown }>("/liability/entries", input);
  return res.data?.data;
}

export async function listLiabilityEntriesNormalized(params: Record<string, unknown>): Promise<{
  data: LiabilityEntryRow[];
  meta: { total: number; page: number; pageSize: number };
}> {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const sortBy = (str(params, "sortBy") || "createdAt") as "createdAt" | "entryDate" | "amount" | "entryType";
  const sortOrder = str(params, "sortOrder") === "asc" ? "asc" : "desc";

  const response = await apiClient.get<{
    success: boolean;
    data: Record<string, unknown>[];
    meta: { total: number; page: number; pageSize: number };
  }>("/liability/entries", {
    params: {
      page,
      pageSize: limit,
      sortBy,
      sortOrder,
      search: toOptionalParam(str(params, "q")) || undefined,
      entryType: toOptionalParam(str(params, "entryType")),
      accountType: toOptionalParam(str(params, "accountType")),
      accountId: toOptionalParam(str(params, "accountId")),
      entryDate_from: toOptionalParam(str(params, "entryDate_from")),
      entryDate_to: toOptionalParam(str(params, "entryDate_to")),
    },
  });

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const meta = response.data?.meta;
  return {
    data: rows.map((row) => normalizeEntry(row)),
    meta: {
      total: Number(meta?.total ?? 0),
      page: Number(meta?.page ?? page),
      pageSize: Number(meta?.pageSize ?? limit),
    },
  };
}

function normalizeLedgerResponse(data: LiabilityLedgerResponse): LiabilityLedgerResponse {
  const opening = Number(data.person?.openingBalance ?? 0);
  const rows: LiabilityLedgerRow[] = (data.rows ?? []).map((r) => {
    const running = Number(r.runningBalance ?? 0);
    return {
      ...r,
      runningBalanceAbs: r.runningBalanceAbs ?? Math.abs(running),
      runningBalanceSide:
        r.runningBalanceSide ?? liabilitySideFromSigned(running),
    };
  });
  return {
    ...data,
    person: {
      ...data.person,
      openingBalanceAbs: data.person.openingBalanceAbs ?? Math.abs(opening),
    },
    rows,
  };
}

export async function getLiabilityPersonLedger(
  personId: string,
  query?: { fromDate?: string; toDate?: string; viewMode?: LiabilityViewMode },
): Promise<LiabilityLedgerResponse> {
  const res = await apiClient.get<{ success: boolean; data: LiabilityLedgerResponse }>(
    `/liability/persons/${personId}/ledger`,
    { params: query },
  );
  return normalizeLedgerResponse(res.data.data);
}

function normalizeSummaryReport(data: LiabilitySummaryReport): LiabilitySummaryReport {
  const net = Number(data.netPosition ?? 0);
  return {
    ...data,
    netPositionAbs: data.netPositionAbs ?? Math.abs(net),
    netPositionSide: data.netPositionSide ?? liabilitySideFromSigned(net),
  };
}

export async function getLiabilitySummaryReport(): Promise<LiabilitySummaryReport> {
  const res = await apiClient.get<{ success: boolean; data: LiabilitySummaryReport }>(
    "/liability/reports/summary",
    { params: { viewMode: "platform" } },
  );
  return normalizeSummaryReport(res.data.data);
}

export async function getLiabilitySummaryReportByMode(viewMode: LiabilityViewMode): Promise<LiabilitySummaryReport> {
  const res = await apiClient.get<{ success: boolean; data: LiabilitySummaryReport }>(
    "/liability/reports/summary",
    { params: { viewMode } },
  );
  return normalizeSummaryReport(res.data.data);
}

function normalizePersonWiseRow(r: LiabilityPersonWiseReportRow): LiabilityPersonWiseReportRow {
  const bal = Number(r.balance ?? 0);
  return {
    ...r,
    balanceAbs: r.balanceAbs ?? Math.abs(bal),
  };
}

export async function getLiabilityPersonWiseReport(): Promise<LiabilityPersonWiseReportRow[]> {
  const res = await apiClient.get<{ success: boolean; data: LiabilityPersonWiseReportRow[] }>(
    "/liability/reports/person-wise",
    { params: { viewMode: "platform" } },
  );
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  return rows.map((r) => normalizePersonWiseRow(r));
}

export async function getLiabilityPersonWiseReportByMode(viewMode: LiabilityViewMode): Promise<LiabilityPersonWiseReportRow[]> {
  const res = await apiClient.get<{ success: boolean; data: LiabilityPersonWiseReportRow[] }>(
    "/liability/reports/person-wise",
    { params: { viewMode } },
  );
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  return rows.map((r) => normalizePersonWiseRow(r));
}

export async function exportLiabilityPersons(params: Record<string, unknown>): Promise<Blob> {
  const response = await apiClient.get("/liability/persons/export", {
    params,
    responseType: "blob",
  });
  return response.data;
}

export async function exportLiabilityEntries(params: Record<string, unknown>): Promise<Blob> {
  const response = await apiClient.get("/liability/entries/export", {
    params,
    responseType: "blob",
  });
  return response.data;
}

export async function exportLiabilityLedger(
  personId: string,
  params: Record<string, unknown>,
): Promise<Blob> {
  const response = await apiClient.get(`/liability/persons/${personId}/ledger/export`, {
    params,
    responseType: "blob",
  });
  return response.data;
}
