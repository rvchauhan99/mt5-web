import { normalizeDateTimeInputForApi } from "@/lib/userTimezone";
import { apiClient } from "./apiClient";
import type {
  BulkBankerApproveResult,
  SavedWithdrawalAccount,
  WithdrawalAmendInput,
  WithdrawalAmendmentEntry,
  WithdrawalBankerPayoutInput,
  WithdrawalCreateInput,
  WithdrawalBulkApproveJobSummary,
  WithdrawalImportJobSummary,
  WithdrawalRow,
  WithdrawalView,
} from "@/types/withdrawal";
import { getAccessToken } from "./sessionStore";

function toOptionalParam(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

type UserLike = {
  _id?: unknown;
  id?: unknown;
  fullName?: unknown;
  username?: unknown;
};

function parseUserRef(user: unknown): { id?: string; label?: string } {
  if (!user) return {};
  if (typeof user === "string") return { id: user };
  if (typeof user !== "object") return {};

  const row = user as UserLike;
  const idRaw = row._id ?? row.id;
  const id = idRaw != null ? String(idRaw).trim() : undefined;
  const fullName = row.fullName != null ? String(row.fullName).trim() : "";
  const username = row.username != null ? String(row.username).trim() : "";
  const label = fullName && username ? `${fullName} (${username})` : fullName || username || undefined;
  return { id, label };
}

export function normalizeWithdrawal(row: Record<string, unknown>): WithdrawalRow {
  const id = String(row._id ?? row.id ?? "");
  const st = row.status;
  const status: WithdrawalRow["status"] =
    st === "requested" || st === "approved" || st === "rejected" || st === "finalized" ? st : "requested";
  const createdByRef = parseUserRef(row.createdBy);
  const approvedByRef = parseUserRef(row.approvedBy);
  const lastAmendedByRef = parseUserRef(row.lastAmendedBy);

  const liabilityPop = row.payoutLiabilityPersonId as Record<string, unknown> | undefined;
  let payoutLiabilityPersonName = row.payoutLiabilityPersonName != null ? String(row.payoutLiabilityPersonName).trim() : "";
  const payoutLiabilityPersonId =
    row.payoutLiabilityPersonId != null &&
    typeof row.payoutLiabilityPersonId === "object" &&
    "_id" in (row.payoutLiabilityPersonId as object)
      ? String((row.payoutLiabilityPersonId as { _id?: unknown })._id)
      : typeof row.payoutLiabilityPersonId === "string"
        ? row.payoutLiabilityPersonId
        : undefined;
  if (!payoutLiabilityPersonName && liabilityPop && liabilityPop.name != null) {
    payoutLiabilityPersonName = String(liabilityPop.name).trim();
  }

  const rawPayoutMode = row.payoutSettlementType;
  let payoutSettlementType: WithdrawalRow["payoutSettlementType"] =
    rawPayoutMode === "person" ? "person" : rawPayoutMode === "bank" ? "bank" : undefined;
  if (payoutSettlementType == null) {
    payoutSettlementType = payoutLiabilityPersonId && !row.payoutBankId ? "person" : "bank";
  }

  const rawHistory = row.amendmentHistory;
  let amendmentHistory: WithdrawalAmendmentEntry[] | undefined;
  if (Array.isArray(rawHistory)) {
    amendmentHistory = rawHistory.map((entry) => {
      const e = entry as Record<string, unknown>;
      const oldSnap = (e.old as Record<string, unknown>) ?? {};
      const newSnap = (e.new as Record<string, unknown>) ?? {};
      return {
        at: e.at != null ? String(e.at) : "",
        by: e.by,
        reason: e.reason != null ? String(e.reason) : "",
        old: {
          amount: oldSnap.amount != null ? Number(oldSnap.amount) : undefined,
          reverseBonus: oldSnap.reverseBonus != null ? Number(oldSnap.reverseBonus) : undefined,
          payableAmount: oldSnap.payableAmount != null ? Number(oldSnap.payableAmount) : undefined,
          payoutBankId: oldSnap.payoutBankId != null ? String(oldSnap.payoutBankId) : undefined,
          payoutBankName: oldSnap.payoutBankName != null ? String(oldSnap.payoutBankName) : undefined,
          payoutLiabilityPersonId:
            oldSnap.payoutLiabilityPersonId != null ? String(oldSnap.payoutLiabilityPersonId) : undefined,
          payoutLiabilityPersonName:
            oldSnap.payoutLiabilityPersonName != null ? String(oldSnap.payoutLiabilityPersonName) : undefined,
          utr: oldSnap.utr != null ? String(oldSnap.utr) : undefined,
        },
        new: {
          amount: newSnap.amount != null ? Number(newSnap.amount) : undefined,
          reverseBonus: newSnap.reverseBonus != null ? Number(newSnap.reverseBonus) : undefined,
          payableAmount: newSnap.payableAmount != null ? Number(newSnap.payableAmount) : undefined,
          payoutBankId: newSnap.payoutBankId != null ? String(newSnap.payoutBankId) : undefined,
          payoutBankName: newSnap.payoutBankName != null ? String(newSnap.payoutBankName) : undefined,
          payoutLiabilityPersonId:
            newSnap.payoutLiabilityPersonId != null ? String(newSnap.payoutLiabilityPersonId) : undefined,
          payoutLiabilityPersonName:
            newSnap.payoutLiabilityPersonName != null ? String(newSnap.payoutLiabilityPersonName) : undefined,
          utr: newSnap.utr != null ? String(newSnap.utr) : undefined,
        },
      };
    });
  }

  return {
    _id: id,
    id,
    playerName: String(row.playerName ?? ""),
    player: row.player,
    accountNumber: row.accountNumber != null ? String(row.accountNumber) : undefined,
    accountHolderName: row.accountHolderName != null ? String(row.accountHolderName) : undefined,
    bankName: String(row.bankName ?? ""),
    ifsc: row.ifsc != null ? String(row.ifsc) : undefined,
    cryptoWalletAddress:
      row.cryptoWalletAddress != null ? String(row.cryptoWalletAddress) : undefined,
    cryptoNetwork: row.cryptoNetwork != null ? String(row.cryptoNetwork) : undefined,
    cryptoAsset: row.cryptoAsset != null ? String(row.cryptoAsset) : undefined,
    amount: Number(row.amount ?? 0),
    operatedCurrency: row.operatedCurrency != null ? String(row.operatedCurrency) : undefined,
    operatedAmount: row.operatedAmount != null ? Number(row.operatedAmount) : undefined,
    exchangeRate: row.exchangeRate != null ? Number(row.exchangeRate) : undefined,
    reverseBonus: row.reverseBonus != null ? Number(row.reverseBonus) : undefined,
    payableAmount: row.payableAmount != null ? Number(row.payableAmount) : undefined,
    payoutSettlementType,
    payoutLiabilityPersonId,
    payoutLiabilityPersonName: payoutLiabilityPersonName || undefined,
    payoutBankId:
      row.payoutBankId != null && typeof row.payoutBankId === "object" && "_id" in (row.payoutBankId as object)
        ? String((row.payoutBankId as { _id?: unknown })._id)
        : typeof row.payoutBankId === "string"
          ? row.payoutBankId
          : undefined,
    payoutBankName: row.payoutBankName != null ? String(row.payoutBankName) : undefined,
    utr: row.utr != null ? String(row.utr) : undefined,
    requestedAt: row.requestedAt != null ? String(row.requestedAt) : undefined,
    status,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : undefined,
    createdBy: createdByRef.id,
    createdByName:
      row.createdByName != null ? String(row.createdByName) : createdByRef.label,
    approvedBy: approvedByRef.id,
    approvedByName:
      row.approvedByName != null ? String(row.approvedByName) : approvedByRef.label,
    amendmentCount: row.amendmentCount != null ? Number(row.amendmentCount) : undefined,
    lastAmendedAt: row.lastAmendedAt != null ? String(row.lastAmendedAt) : undefined,
    lastAmendedBy: row.lastAmendedBy,
    lastAmendedByName:
      row.lastAmendedByName != null ? String(row.lastAmendedByName) : lastAmendedByRef.label,
    amendmentHistory,
  };
}

function str(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (v === undefined || v === null) return "";
  return String(v);
}

function normalizeDateTimeInput(value: string | undefined): string | undefined {
  return normalizeDateTimeInputForApi(value);
}

export async function createWithdrawal(input: WithdrawalCreateInput): Promise<unknown> {
  const response = await apiClient.post<{ success: boolean; data: unknown }>("/withdrawal", {
    ...input,
    requestedAt: normalizeDateTimeInput(input.requestedAt),
  });
  return response.data?.data;
}

export async function updateWithdrawal(id: string, input: Partial<WithdrawalCreateInput>): Promise<unknown> {
  const response = await apiClient.patch<{ success: boolean; data: unknown }>(`/withdrawal/${id}`, input);
  return response.data?.data;
}

export async function exportWithdrawals(params: Record<string, unknown>): Promise<Blob> {
  const response = await apiClient.get("/withdrawal/export", {
    params: {
      ...params,
      hasAmendment: toOptionalParam(str(params, "hasAmendment")) as "yes" | "no" | undefined,
    },
    responseType: "blob",
  });
  return response.data;
}

export type LastBankerPayoutMeta = { bankId: string; bankName: string } | null | undefined;

export async function listWithdrawalsNormalized(
  view: WithdrawalView,
  params: Record<string, unknown>,
): Promise<{
  data: WithdrawalRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    lastBankerPayout?: LastBankerPayoutMeta;
  };
}> {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const sortBy =
    (str(params, "sortBy") || "requestedAt") as
      | "requestedAt"
      | "createdAt"
      | "amount"
      | "payableAmount"
      | "status"
      | "playerName"
      | "bankName"
      | "utr";
  const sortOrder = str(params, "sortOrder") === "asc" ? "asc" : "desc";

  const response = await apiClient.get<{
    success: boolean;
    data: Record<string, unknown>[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      lastBankerPayout?: LastBankerPayoutMeta;
    };
  }>("/withdrawal", {
    params: {
      view,
      page,
      pageSize: limit,
      sortBy,
      sortOrder,
      search: toOptionalParam(str(params, "q")) || undefined,
      status: toOptionalParam(str(params, "status")),
      playerName: toOptionalParam(str(params, "playerName")),
      playerName_op: toOptionalParam(str(params, "playerName_op")),
      utr: toOptionalParam(str(params, "utr")),
      utr_op: toOptionalParam(str(params, "utr_op")),
      bankName: toOptionalParam(str(params, "bankName")),
      bankName_op: toOptionalParam(str(params, "bankName_op")),
      amount: toOptionalParam(str(params, "amount")),
      amount_to: toOptionalParam(str(params, "amount_to")),
      amount_op: toOptionalParam(str(params, "amount_op")),
      payableAmount: toOptionalParam(str(params, "payableAmount")),
      payableAmount_to: toOptionalParam(str(params, "payableAmount_to")),
      payableAmount_op: toOptionalParam(str(params, "payableAmount_op")),
      createdAt_from: toOptionalParam(str(params, "createdAt_from")),
      createdAt_to: toOptionalParam(str(params, "createdAt_to")),
      createdAt_op: toOptionalParam(str(params, "createdAt_op")),
      createdBy: toOptionalParam(str(params, "createdBy")),
      approvedBy: toOptionalParam(str(params, "approvedBy")),
      hasAmendment: toOptionalParam(str(params, "hasAmendment")) as "yes" | "no" | undefined,
    },
  });

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const meta = response.data?.meta;
  const lastBankerPayout = meta?.lastBankerPayout;
  return {
    data: rows.map((row) => normalizeWithdrawal(row)),
    meta: {
      total: Number(meta?.total ?? 0),
      page: Number(meta?.page ?? page),
      pageSize: Number(meta?.pageSize ?? limit),
      ...(view === "banker" || view === "exchange" ? { lastBankerPayout } : {}),
    },
  };
}

export async function updateWithdrawalBankerPayout(id: string, body: WithdrawalBankerPayoutInput): Promise<unknown> {
  const response = await apiClient.patch<{ success: boolean; data: unknown }>(`/withdrawal/${id}/banker-payout`, body);
  return response.data?.data;
}

export async function patchWithdrawalStatus(
  id: string,
  body:
    | { status: "rejected"; reasonId: string; remark?: string }
    | { status: "finalized" },
): Promise<unknown> {
  const response = await apiClient.patch<{ success: boolean; data: unknown }>(`/withdrawal/${id}/status`, body);
  return response.data?.data;
}

export async function listSavedAccountsForPlayer(playerId: string): Promise<SavedWithdrawalAccount[]> {
  const response = await apiClient.get<{ success: boolean; data: SavedWithdrawalAccount[] }>(
    `/withdrawal/player/${playerId}/saved-accounts`,
  );
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
}

export async function amendWithdrawal(id: string, body: WithdrawalAmendInput): Promise<unknown> {
  const payload: Record<string, unknown> = {
    amount: body.amount,
    reverseBonus: body.reverseBonus,
    utr: body.utr,
    reasonId: body.reasonId,
  };
  const requestedAtIso = normalizeDateTimeInput(body.requestedAt);
  if (requestedAtIso) payload.requestedAt = requestedAtIso;
  const bankId = body.payoutBankId?.trim();
  if (bankId) payload.payoutBankId = bankId;
  const remark = body.remark?.trim();
  if (remark) payload.remark = remark;
  const response = await apiClient.post<{ success: boolean; data: unknown }>(`/withdrawal/${id}/amend`, payload);
  return response.data?.data;
}

export async function deleteWithdrawal(id: string): Promise<unknown> {
  const response = await apiClient.delete<{ success: boolean; data: unknown }>(`/withdrawal/${id}`);
  return response.data?.data;
}

export async function bulkBankerApprove(withdrawalIds: string[]): Promise<BulkBankerApproveResult> {
  const response = await apiClient.post<{ success: boolean; data: BulkBankerApproveResult }>(
    "/withdrawal/bulk-banker-approve",
    { withdrawalIds },
  );
  return (
    response.data?.data ?? {
      approved: 0,
      failed: [],
    }
  );
}

export async function createBulkBankerApproveJob(withdrawalIds: string[]): Promise<{ jobId: string; status: string }> {
  const response = await apiClient.post<{ success: boolean; data: { jobId: string; status: string } }>(
    "/withdrawal/bulk-banker-approve/jobs",
    { withdrawalIds },
    { timeout: 60_000 },
  );
  return response.data.data;
}

export async function getBulkBankerApproveJob(jobId: string): Promise<WithdrawalBulkApproveJobSummary> {
  const response = await apiClient.get<{ success: boolean; data: WithdrawalBulkApproveJobSummary }>(
    `/withdrawal/bulk-banker-approve/jobs/${encodeURIComponent(jobId)}`,
    { timeout: 30_000 },
  );
  return response.data.data;
}

export async function streamBulkBankerApproveJobEvents(
  jobId: string,
  onProgress: (payload: WithdrawalBulkApproveJobSummary) => void,
): Promise<() => void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Missing access token for realtime updates");
  }
  const controller = new AbortController();
  const response = await fetch(
    `${apiClient.defaults.baseURL}/withdrawal/bulk-banker-approve/jobs/${encodeURIComponent(jobId)}/events`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      credentials: "include",
    },
  );
  if (!response.ok || !response.body) {
    throw new Error("Unable to connect to bulk settle progress stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  const processChunk = (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split("\n");
      let eventName = "message";
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (eventName !== "progress" || !dataLine) continue;
      try {
        const eventData = JSON.parse(dataLine) as {
          jobId: string;
          status: WithdrawalBulkApproveJobSummary["status"];
          totalRows: number;
          processedRows: number;
          successRows: number;
          failedRows: number;
          message?: string;
        };
        onProgress({
          id: eventData.jobId,
          status: eventData.status,
          createdBy: "",
          createdAt: new Date().toISOString(),
          failureReason: eventData.message,
          progress: {
            totalRows: eventData.totalRows,
            processedRows: eventData.processedRows,
            successRows: eventData.successRows,
            failedRows: eventData.failedRows,
          },
          errorSample: [],
        });
      } catch {
        // Ignore malformed events.
      }
    }
  };

  void (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }
    } catch {
      // Caller handles fallback polling.
    }
  })();

  return () => controller.abort();
}

// ---------------------------------------------------------------------------
// CSV Import
// ---------------------------------------------------------------------------

export type WithdrawalImportValidRow = {
  row: number;
  playerMongoId: string;
  playerIdLabel?: string;
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  ifsc: string;
  amount: number;
  operatedCurrency: string;
  operatedAmount: number;
  exchangeRate: number;
  reverseBonus: number;
  payableAmount: number;
  requestedAt?: string;
  payoutUtr?: string;
  payoutSettlementType?: "bank" | "person";
  payoutBankId?: string;
  payoutBankDisplayLabel?: string;
  payoutLiabilityPersonId?: string;
  payoutLiabilityPersonName?: string;
};

export type WithdrawalImportInvalidRow = {
  row: number;
  dateTime: string;
  playerId: string;
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  ifsc: string;
  operatedCurrency: string;
  withdrawalAmount: string;
  exchangeRate: string;
  platformAmount: string;
  payoutUtr: string;
  payoutSettlementType: string;
  payoutBank: string;
  payoutLiablePersonName: string;
  errors: string[];
};

export type WithdrawalImportValidationResult = {
  summary: { total: number; valid: number; invalid: number; skipped: number };
  validRows: WithdrawalImportValidRow[];
  invalidRows: WithdrawalImportInvalidRow[];
};

export async function downloadWithdrawalImportSample(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
  const response = await apiClient.get("/withdrawal/import/sample", {
    responseType: "blob",
    params: {
      ...(format === "xlsx" ? { format: "xlsx" } : {}),
      _: Date.now(),
    },
  });
  return response.data as Blob;
}

export async function validateWithdrawalImport(file: File): Promise<WithdrawalImportValidationResult> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<{ success: boolean; data: WithdrawalImportValidationResult }>(
    "/withdrawal/import/validate",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data.data;
}

export async function createWithdrawalImportJob(
  rows: Array<{
    playerMongoId: string;
    accountNumber: string;
    accountHolderName: string;
    bankName: string;
    ifsc: string;
    amount: number;
    operatedCurrency: string;
    operatedAmount: number;
    exchangeRate: number;
    reverseBonus: number;
    requestedAt?: string;
    payoutUtr?: string;
    payoutSettlementType?: "bank" | "person";
    payoutBankId?: string;
    payoutLiabilityPersonId?: string;
  }>,
): Promise<{ jobId: string; status: string }> {
  const response = await apiClient.post<{ success: boolean; data: { jobId: string; status: string } }>(
    "/withdrawal/import/jobs",
    { rows },
    { timeout: 60_000 },
  );
  return response.data.data;
}

export async function getWithdrawalImportJob(jobId: string): Promise<WithdrawalImportJobSummary> {
  const response = await apiClient.get<{ success: boolean; data: WithdrawalImportJobSummary }>(
    `/withdrawal/import/jobs/${encodeURIComponent(jobId)}`,
    { timeout: 30_000 },
  );
  return response.data.data;
}

export async function downloadWithdrawalImportJobErrorCsv(
  jobId: string,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await apiClient.get<Blob>(`/withdrawal/import/jobs/${encodeURIComponent(jobId)}/errors.csv`, {
    responseType: "blob",
  });
  const contentDisposition = String(response.headers["content-disposition"] ?? "");
  const fileName = parseDispositionFileName(contentDisposition) ?? `withdrawal-import-errors-${jobId}.csv`;
  return { blob: response.data, fileName };
}

export async function streamWithdrawalImportJobEvents(
  jobId: string,
  onProgress: (payload: WithdrawalImportJobSummary) => void,
): Promise<() => void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Missing access token for realtime updates");
  }

  const controller = new AbortController();
  const response = await fetch(
    `${apiClient.defaults.baseURL}/withdrawal/import/jobs/${encodeURIComponent(jobId)}/events`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      credentials: "include",
    },
  );
  if (!response.ok || !response.body) {
    throw new Error("Unable to connect to import progress stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  const processChunk = (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split("\n");
      let eventName = "message";
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (eventName !== "progress" || !dataLine) continue;
      try {
        const eventData = JSON.parse(dataLine) as {
          jobId: string;
          status: WithdrawalImportJobSummary["status"];
          totalRows: number;
          processedRows: number;
          successRows: number;
          failedRows: number;
          skippedRows: number;
          message?: string;
        };
        onProgress({
          id: eventData.jobId,
          status: eventData.status,
          createdBy: "",
          createdAt: new Date().toISOString(),
          failureReason: eventData.message,
          progress: {
            totalRows: eventData.totalRows,
            processedRows: eventData.processedRows,
            successRows: eventData.successRows,
            failedRows: eventData.failedRows,
            skippedRows: eventData.skippedRows,
          },
          errorSample: [],
          errorCsvAvailable: false,
        });
      } catch {
        // Ignore malformed events.
      }
    }
  };

  void (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }
    } catch {
      // Caller handles fallback polling.
    }
  })();

  return () => controller.abort();
}

function parseDispositionFileName(contentDisposition: string | undefined): string | null {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
  if (!plainMatch?.[1]) return null;
  return plainMatch[1];
}
