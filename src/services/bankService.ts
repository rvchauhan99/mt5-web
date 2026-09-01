import { apiClient } from "./apiClient";
import type { BankCreateInput, BankRow } from "@/types/bank";
import { bankDisplayLabel } from "@/lib/constants/bankMethods";

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
  const id = typeof idRaw === "string" ? idRaw : idRaw != null ? String(idRaw) : undefined;
  const nameCandidate = [row.fullName, row.full_name, row.username, row.name].find(
    (entry) => typeof entry === "string" && String(entry).trim() !== "",
  );
  const name = typeof nameCandidate === "string" ? nameCandidate : undefined;
  return { id, name };
}

function normalizeBank(row: Record<string, unknown>): BankRow {
  const id = String(row._id ?? row.id ?? "");
  const createdByUser = parseAuditUser(row.createdBy);
  const createdByName = toOptionalParam(
    row.createdByName ?? row["created_by_name" as keyof typeof row] ?? createdByUser.name,
  );
  return {
    _id: id,
    id,
    method: row.method != null && String(row.method).trim() !== "" ? String(row.method) : undefined,
    holderName: String(row.holderName ?? ""),
    bankName: String(row.bankName ?? ""),
    accountNumber: String(row.accountNumber ?? ""),
    ifsc: String(row.ifsc ?? ""),
    displayName: bankDisplayLabel({
      method: String(row.method ?? ""),
      holderName: String(row.holderName ?? ""),
      bankName: String(row.bankName ?? ""),
      accountNumber: String(row.accountNumber ?? ""),
    }),
    openingBalance: Number(row.openingBalance ?? 0),
    openingOperatedCurrency:
      row.openingOperatedCurrency != null ? String(row.openingOperatedCurrency) : undefined,
    openingOperatedAmount:
      row.openingOperatedAmount != null ? Number(row.openingOperatedAmount) : undefined,
    openingExchangeRate:
      row.openingExchangeRate != null ? Number(row.openingExchangeRate) : undefined,
    currentBalance: row.currentBalance != null ? Number(row.currentBalance) : undefined,
    closingBalanceActual:
      row.closingBalanceActual != null ? Number(row.closingBalanceActual) : undefined,
    status: (row.status === "deactive" ? "deactive" : "active") as BankRow["status"],
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : undefined,
    createdBy: row.createdBy,
    createdByName,
  };
}

function str(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (v === undefined || v === null) return "";
  return String(v);
}

/**
 * Flat fetcher params → GET /bank, normalized for PaginatedTableReference.
 */
export async function listBanksNormalized(params: Record<string, unknown>): Promise<{
  data: BankRow[];
  meta: { total: number; page: number; pageSize: number };
}> {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const sortBy =
    (str(params, "sortBy") || "createdAt") as
      | "createdAt"
      | "holderName"
      | "bankName"
      | "accountNumber"
      | "ifsc"
      | "openingBalance"
      | "status"
      | "method";
  const sortOrder = str(params, "sortOrder") === "asc" ? "asc" : "desc";

  const response = await apiClient.get<{
    success: boolean;
    data: Record<string, unknown>[];
    meta: { total: number; page: number; pageSize: number };
  }>("/bank", {
    params: {
      page,
      pageSize: limit,
      sortBy,
      sortOrder,
      search: toOptionalParam(str(params, "q")) || undefined,
      method: toOptionalParam(str(params, "method")),
      holderName: toOptionalParam(str(params, "holderName")),
      holderName_op: toOptionalParam(str(params, "holderName_op")),
      bankName: toOptionalParam(str(params, "bankName")),
      bankName_op: toOptionalParam(str(params, "bankName_op")),
      accountNumber: toOptionalParam(str(params, "accountNumber")),
      accountNumber_op: toOptionalParam(str(params, "accountNumber_op")),
      ifsc: toOptionalParam(str(params, "ifsc")),
      ifsc_op: toOptionalParam(str(params, "ifsc_op")),
      openingBalance: toOptionalParam(str(params, "openingBalance")),
      openingBalance_to: toOptionalParam(str(params, "openingBalance_to")),
      openingBalance_op: toOptionalParam(str(params, "openingBalance_op")),
      status: toOptionalParam(str(params, "status")),
      createdBy: toOptionalParam(str(params, "createdBy")),
      createdAt_from: toOptionalParam(str(params, "createdAt_from")),
      createdAt_to: toOptionalParam(str(params, "createdAt_to")),
      createdAt_op: toOptionalParam(str(params, "createdAt_op")),
    },
  });

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const meta = response.data?.meta;
  return {
    data: rows.map((row) => normalizeBank(row)),
    meta: {
      total: Number(meta?.total ?? 0),
      page: Number(meta?.page ?? page),
      pageSize: Number(meta?.pageSize ?? limit),
    },
  };
}

export async function exportBanks(params: Record<string, unknown>): Promise<Blob> {
  const sortBy =
    (str(params, "sortBy") || "createdAt") as
      | "createdAt"
      | "holderName"
      | "bankName"
      | "accountNumber"
      | "ifsc"
      | "openingBalance"
      | "status"
      | "method";
  const sortOrder = str(params, "sortOrder") === "asc" ? "asc" : "desc";

  const response = await apiClient.get("/bank/export", {
    params: {
      sortBy,
      sortOrder,
      search: toOptionalParam(str(params, "q")) || undefined,
      method: toOptionalParam(str(params, "method")),
      holderName: toOptionalParam(str(params, "holderName")),
      holderName_op: toOptionalParam(str(params, "holderName_op")),
      bankName: toOptionalParam(str(params, "bankName")),
      bankName_op: toOptionalParam(str(params, "bankName_op")),
      accountNumber: toOptionalParam(str(params, "accountNumber")),
      accountNumber_op: toOptionalParam(str(params, "accountNumber_op")),
      ifsc: toOptionalParam(str(params, "ifsc")),
      ifsc_op: toOptionalParam(str(params, "ifsc_op")),
      openingBalance: toOptionalParam(str(params, "openingBalance")),
      openingBalance_to: toOptionalParam(str(params, "openingBalance_to")),
      openingBalance_op: toOptionalParam(str(params, "openingBalance_op")),
      status: toOptionalParam(str(params, "status")),
      createdBy: toOptionalParam(str(params, "createdBy")),
      createdAt_from: toOptionalParam(str(params, "createdAt_from")),
      createdAt_to: toOptionalParam(str(params, "createdAt_to")),
      createdAt_op: toOptionalParam(str(params, "createdAt_op")),
    },
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function createBank(input: BankCreateInput): Promise<{ data: unknown; created: boolean }> {
  const response = await apiClient.post<{
    success: boolean;
    data: unknown;
    meta?: { created?: boolean; updated?: boolean };
  }>("/bank", input);
  const created = response.data?.meta?.created !== false;
  return { data: response.data?.data, created };
}

/** Raw list response `{ success, data, meta }` — for legacy callers (e.g. statement page). */
export async function listBanksRaw(page = 1, pageSize = 20) {
  return (await apiClient.get("/bank", { params: { page, pageSize } })).data as {
    success: boolean;
    data: Record<string, unknown>[];
    meta: { total: number; page: number; pageSize: number };
  };
}

export type BankLedgerRow = {
  kind: "deposit" | "withdrawal" | "expense" | "liability" | "settlement" | "referral";
  refId: string;
  at: string;
  label: string;
  utr?: string;
  playerName?: string;
  createdByName?: string;
  amount: number;
  direction: "credit" | "debit";
  balanceAfter: number;
  bonusMemo?: number;
};

export type BankLedgerResponse = {
  bank: {
    _id: string;
    method?: string;
    holderName: string;
    bankName: string;
    accountNumber: string;
    displayName?: string;
    openingBalance: number;
    currentBalance: number;
  };
  periodOpeningBalance: number;
  periodClosingBalance: number;
  totalCredits: number;
  totalDebits: number;
  totalBonusGiven: number;
  totalBonusReversed: number;
  rows: BankLedgerRow[];
};

export type BankComputedClosingResponse = {
  systemClosingBalance: number;
};

export type BankSettlementRecord = {
  _id: string;
  bankId: string;
  effectiveAt: string;
  masterReportedBalance: number;
  signedAmount: number;
  systemBalanceBefore: number;
  reason: string;
  createdBy?: unknown;
  createdAt?: string;
};

export async function getBankLedger(
  bankId: string,
  query?: {
    fromDate?: string;
    toDate?: string;
    entryType?: "all" | "deposit" | "withdrawal" | "expense" | "liability" | "settlement" | "referral";
  },
): Promise<BankLedgerResponse> {
  const res = await apiClient.get<{ success: boolean; data: BankLedgerResponse }>(
    `/bank/${bankId}/ledger`,
    { params: query },
  );
  return res.data.data;
}

export async function getBankComputedClosing(bankId: string): Promise<BankComputedClosingResponse> {
  const res = await apiClient.get<{ success: boolean; data: BankComputedClosingResponse }>(
    `/bank/${bankId}/computed-closing`,
  );
  return res.data.data;
}

export async function listBankSettlements(bankId: string): Promise<BankSettlementRecord[]> {
  const res = await apiClient.get<{ success: boolean; data: BankSettlementRecord[] }>(
    `/bank/${bankId}/settlements`,
  );
  return Array.isArray(res.data.data) ? res.data.data : [];
}

export async function createBankSettlement(
  bankId: string,
  body: { effectiveAt: string; masterReportedBalance: number; reason: string },
): Promise<BankSettlementRecord> {
  const res = await apiClient.post<{ success: boolean; data: BankSettlementRecord }>(
    `/bank/${bankId}/settlements`,
    body,
  );
  return res.data.data;
}
