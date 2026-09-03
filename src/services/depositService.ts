import { normalizeDateTimeInputForApi } from "@/lib/userTimezone";
import { apiClient } from "./apiClient";
import type {
  DepositAmendInput,
  DepositAmendmentEntry,
  DepositBulkExchangeApproveJobSummary,
  DepositCreateInput,
  DepositImportJobSummary,
  DepositRow,
  DepositUpdateInput,
  DepositView,
} from "@/types/deposit";
import { getAccessToken } from "./sessionStore";

function toOptionalParam(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

function parseAuditUser(value: unknown): { id?: string; name?: string } {
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

export function normalizeDeposit(row: Record<string, unknown>): DepositRow {
  const id = String(row._id ?? row.id ?? "");
  const createdByUser = parseAuditUser(row.createdBy);
  const exchangeBy = parseAuditUser(row.exchangeActionBy);
  const createdByName = toOptionalParam(
    row.createdByName ?? row["created_by_name" as keyof typeof row] ?? createdByUser.name,
  );
  const exchangeActionByName = toOptionalParam(exchangeBy.name);

  const player = row.player as Record<string, unknown> | undefined;
  const playerIdLabel =
    player && player.playerId != null ? String(player.playerId) : undefined;
  const playerMongoId = (() => {
    if (player && typeof player === "object") {
      const raw = player._id ?? player.id;
      return raw != null ? String(raw) : undefined;
    }
    if (typeof row.player === "string" && row.player.trim()) return row.player.trim();
    return undefined;
  })();

  const bankPop = row.bankId as Record<string, unknown> | undefined;
  let bankName = String(row.bankName ?? "").trim();
  if (!bankName && bankPop && typeof bankPop.holderName === "string") {
    bankName =
      `${bankPop.holderName} - ${bankPop.bankName ?? ""} - ${String(bankPop.accountNumber ?? "").slice(-4)}`.trim();
  }

  const lpPop = row.liabilityPersonId as Record<string, unknown> | undefined;
  let liabilityPersonName = String(row.liabilityPersonName ?? "").trim();
  const liabilityPersonId =
    row.liabilityPersonId != null && typeof row.liabilityPersonId === "object" && "_id" in (row.liabilityPersonId as object)
      ? String((row.liabilityPersonId as { _id?: unknown })._id)
      : typeof row.liabilityPersonId === "string"
        ? row.liabilityPersonId
        : undefined;
  if (!liabilityPersonName && lpPop && lpPop.name != null) liabilityPersonName = String(lpPop.name).trim();

  const rawSettle = row.settlementAccountType;
  let settlementAccountType: DepositRow["settlementAccountType"] =
    rawSettle === "person" ? "person" : rawSettle === "bank" ? "bank" : undefined;
  if (settlementAccountType == null) {
    settlementAccountType = liabilityPersonId && !row.bankId ? "person" : "bank";
  }

  const st = row.status;
  const status: DepositRow["status"] =
    st === "verified" ||
    st === "rejected" ||
    st === "finalized" ||
    st === "pending" ||
    st === "not_settled"
      ? st
      : "pending";

  const lastAmendedByUser = parseAuditUser(row.lastAmendedBy);
  const lastAmendedByName = toOptionalParam(lastAmendedByUser.name);

  const rawHistory = row.amendmentHistory;
  let amendmentHistory: DepositAmendmentEntry[] | undefined;
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
          bankId: oldSnap.bankId != null ? String(oldSnap.bankId) : undefined,
          bankName: oldSnap.bankName != null ? String(oldSnap.bankName) : undefined,
          liabilityPersonId:
            oldSnap.liabilityPersonId != null ? String(oldSnap.liabilityPersonId) : undefined,
          liabilityPersonName:
            oldSnap.liabilityPersonName != null ? String(oldSnap.liabilityPersonName) : undefined,
          utr: oldSnap.utr != null ? String(oldSnap.utr) : undefined,
          amount: oldSnap.amount != null ? Number(oldSnap.amount) : undefined,
          playerId: oldSnap.playerId != null ? String(oldSnap.playerId) : undefined,
          bonusAmount: oldSnap.bonusAmount != null ? Number(oldSnap.bonusAmount) : undefined,
          totalAmount: oldSnap.totalAmount != null ? Number(oldSnap.totalAmount) : undefined,
        },
        new: {
          bankId: newSnap.bankId != null ? String(newSnap.bankId) : undefined,
          bankName: newSnap.bankName != null ? String(newSnap.bankName) : undefined,
          liabilityPersonId:
            newSnap.liabilityPersonId != null ? String(newSnap.liabilityPersonId) : undefined,
          liabilityPersonName:
            newSnap.liabilityPersonName != null ? String(newSnap.liabilityPersonName) : undefined,
          utr: newSnap.utr != null ? String(newSnap.utr) : undefined,
          amount: newSnap.amount != null ? Number(newSnap.amount) : undefined,
          playerId: newSnap.playerId != null ? String(newSnap.playerId) : undefined,
          bonusAmount: newSnap.bonusAmount != null ? Number(newSnap.bonusAmount) : undefined,
          totalAmount: newSnap.totalAmount != null ? Number(newSnap.totalAmount) : undefined,
        },
      };
    });
  }

  return {
    _id: id,
    id,
    settlementAccountType,
    liabilityPersonId,
    liabilityPersonName: liabilityPersonName || undefined,
    bankId: row.bankId != null && typeof row.bankId === "object" && "_id" in (row.bankId as object)
      ? String((row.bankId as { _id?: unknown })._id)
      : typeof row.bankId === "string"
        ? row.bankId
        : undefined,
    bankName,
    utr: String(row.utr ?? ""),
    amount: Number(row.amount ?? 0),
    operatedCurrency: row.operatedCurrency != null ? String(row.operatedCurrency) : undefined,
    operatedAmount: row.operatedAmount != null ? Number(row.operatedAmount) : undefined,
    exchangeRate: row.exchangeRate != null ? Number(row.exchangeRate) : undefined,
    status,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : undefined,
    createdBy: row.createdBy,
    createdByName,
    bankId_populated: row.bankId,
    player: row.player,
    playerIdLabel,
    playerMongoId,
    bonusAmount: row.bonusAmount != null ? Number(row.bonusAmount) : undefined,
    totalAmount: row.totalAmount != null ? Number(row.totalAmount) : undefined,
    rejectReason: row.rejectReason != null ? String(row.rejectReason) : undefined,
    exchangeActionBy: row.exchangeActionBy,
    exchangeActionByName,
    exchangeActionAt: row.exchangeActionAt != null ? String(row.exchangeActionAt) : undefined,
    bankBalanceAfter: row.bankBalanceAfter != null ? Number(row.bankBalanceAfter) : undefined,
    entryAt: row.entryAt != null ? String(row.entryAt) : undefined,
    settledAt: row.settledAt != null ? String(row.settledAt) : undefined,
    amendmentCount: row.amendmentCount != null ? Number(row.amendmentCount) : undefined,
    lastAmendedAt: row.lastAmendedAt != null ? String(row.lastAmendedAt) : undefined,
    lastAmendedBy: row.lastAmendedBy,
    lastAmendedByName,
    amendmentHistory,
  };
}

function str(params: Record<string, unknown>, key: string): string {
  const v = params[key];
  if (v === undefined || v === null) return "";
  return String(v);
}

/** Must match API `listDepositQuerySchema.sortBy` enum. */
const DEPOSIT_LIST_SORT_BY = [
  "entryAt",
  "createdAt",
  "amount",
  "utr",
  "status",
  "bonusAmount",
  "totalAmount",
  "settledAt",
  "bankName",
] as const;

type DepositListSortBy = (typeof DEPOSIT_LIST_SORT_BY)[number];

function coerceDepositListSortBy(raw: unknown): DepositListSortBy {
  const s = typeof raw === "string" ? raw.trim() : "";
  if ((DEPOSIT_LIST_SORT_BY as readonly string[]).includes(s)) return s as DepositListSortBy;
  return "entryAt";
}

function normalizeDateTimeInput(value: string | undefined): string | undefined {
  return normalizeDateTimeInputForApi(value);
}

export async function createDeposit(input: DepositCreateInput): Promise<unknown> {
  const response = await apiClient.post<{ success: boolean; data: unknown }>("/deposit", {
    ...input,
    entryAt: normalizeDateTimeInput(input.entryAt),
  });
  return response.data?.data;
}

export async function updateDeposit(id: string, input: DepositUpdateInput): Promise<unknown> {
  const response = await apiClient.put<{ success: boolean; data: unknown }>(`/deposit/${id}`, {
    ...input,
    entryAt: normalizeDateTimeInput(input.entryAt),
  });
  return response.data?.data;
}

export type LastBankerDepositMeta = { bankId: string; bankName: string } | null | undefined;

export async function listDepositsNormalized(
  view: DepositView,
  params: Record<string, unknown>,
): Promise<{
  data: DepositRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    lastBankerDeposit?: LastBankerDepositMeta;
  };
}> {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const sortBy = coerceDepositListSortBy(str(params, "sortBy") || "entryAt");
  const sortOrder = str(params, "sortOrder") === "asc" ? "asc" : "desc";

  const response = await apiClient.get<{
    success: boolean;
    data: Record<string, unknown>[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      lastBankerDeposit?: LastBankerDepositMeta;
    };
  }>("/deposit", {
    params: {
      view,
      page,
      pageSize: limit,
      sortBy,
      sortOrder,
      search: toOptionalParam(str(params, "q")) || undefined,
      utr: toOptionalParam(str(params, "utr")),
      utr_op: toOptionalParam(str(params, "utr_op")),
      bankName: toOptionalParam(str(params, "bankName")),
      bankName_op: toOptionalParam(str(params, "bankName_op")),
      bankId: toOptionalParam(str(params, "bankId")),
      status: toOptionalParam(str(params, "status")),
      amount: toOptionalParam(str(params, "amount")),
      amount_to: toOptionalParam(str(params, "amount_to")),
      amount_op: toOptionalParam(str(params, "amount_op")),
      totalAmount: toOptionalParam(str(params, "totalAmount")),
      totalAmount_to: toOptionalParam(str(params, "totalAmount_to")),
      totalAmount_op: toOptionalParam(str(params, "totalAmount_op")),
      player: toOptionalParam(str(params, "player")),
      createdBy: toOptionalParam(str(params, "createdBy")),
      createdAt_from: toOptionalParam(str(params, "createdAt_from")),
      createdAt_to: toOptionalParam(str(params, "createdAt_to")),
      createdAt_op: toOptionalParam(str(params, "createdAt_op")),
      hasAmendment: toOptionalParam(str(params, "hasAmendment")) as "yes" | "no" | undefined,
    },
  });

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const meta = response.data?.meta;
  const lastBankerDeposit = meta?.lastBankerDeposit;
  return {
    data: rows.map((row) => normalizeDeposit(row)),
    meta: {
      total: Number(meta?.total ?? 0),
      page: Number(meta?.page ?? page),
      pageSize: Number(meta?.pageSize ?? limit),
      ...(lastBankerDeposit != null ? { lastBankerDeposit } : {}),
    },
  };
}

export async function exportDeposits(view: DepositView, params: Record<string, unknown>): Promise<Blob> {
  const sortBy = coerceDepositListSortBy(str(params, "sortBy") || "entryAt");
  const sortOrder = str(params, "sortOrder") === "asc" ? "asc" : "desc";

  const response = await apiClient.get("/deposit/export", {
    params: {
      view,
      sortBy,
      sortOrder,
      search: toOptionalParam(str(params, "q")) || undefined,
      utr: toOptionalParam(str(params, "utr")),
      utr_op: toOptionalParam(str(params, "utr_op")),
      bankName: toOptionalParam(str(params, "bankName")),
      bankName_op: toOptionalParam(str(params, "bankName_op")),
      bankId: toOptionalParam(str(params, "bankId")),
      status: toOptionalParam(str(params, "status")),
      amount: toOptionalParam(str(params, "amount")),
      amount_to: toOptionalParam(str(params, "amount_to")),
      amount_op: toOptionalParam(str(params, "amount_op")),
      totalAmount: toOptionalParam(str(params, "totalAmount")),
      totalAmount_to: toOptionalParam(str(params, "totalAmount_to")),
      totalAmount_op: toOptionalParam(str(params, "totalAmount_op")),
      player: toOptionalParam(str(params, "player")),
      createdBy: toOptionalParam(str(params, "createdBy")),
      createdAt_from: toOptionalParam(str(params, "createdAt_from")),
      createdAt_to: toOptionalParam(str(params, "createdAt_to")),
      createdAt_op: toOptionalParam(str(params, "createdAt_op")),
      hasAmendment: toOptionalParam(str(params, "hasAmendment")) as "yes" | "no" | undefined,
    },
    responseType: "blob",
  });
  return response.data as Blob;
}

export type BulkExchangeApproveResult = {
  approved: number;
  failed: Array<{ depositId: string; error: string }>;
};

export async function bulkExchangeApprove(depositIds: string[]): Promise<BulkExchangeApproveResult> {
  const response = await apiClient.post<{ success: boolean; data: BulkExchangeApproveResult }>(
    "/deposit/bulk-exchange-approve",
    { depositIds },
  );
  return (
    response.data?.data ?? {
      approved: 0,
      failed: [],
    }
  );
}

export async function createBulkExchangeApproveJob(depositIds: string[]): Promise<{ jobId: string; status: string }> {
  const response = await apiClient.post<{ success: boolean; data: { jobId: string; status: string } }>(
    "/deposit/bulk-exchange-approve/jobs",
    { depositIds },
    { timeout: 60_000 },
  );
  return response.data.data;
}

export async function getBulkExchangeApproveJob(jobId: string): Promise<DepositBulkExchangeApproveJobSummary> {
  const response = await apiClient.get<{ success: boolean; data: DepositBulkExchangeApproveJobSummary }>(
    `/deposit/bulk-exchange-approve/jobs/${encodeURIComponent(jobId)}`,
    { timeout: 30_000 },
  );
  return response.data.data;
}

export async function streamBulkExchangeApproveJobEvents(
  jobId: string,
  onProgress: (payload: DepositBulkExchangeApproveJobSummary) => void,
): Promise<() => void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Missing access token for realtime updates");
  }
  const controller = new AbortController();
  const response = await fetch(
    `${apiClient.defaults.baseURL}/deposit/bulk-exchange-approve/jobs/${encodeURIComponent(jobId)}/events`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      credentials: "include",
    },
  );
  if (!response.ok || !response.body) {
    throw new Error("Unable to connect to bulk exchange approve progress stream");
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
          status: DepositBulkExchangeApproveJobSummary["status"];
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

export async function exchangeActionApprove(depositId: string, playerId: string, bonusAmount: number) {
  const response = await apiClient.post<{ success: boolean; data: unknown }>(
    `/deposit/${depositId}/exchange-action`,
    { action: "approve", playerId, bonusAmount },
  );
  return response.data?.data;
}

export async function exchangeActionReject(
  depositId: string,
  input: { reasonId: string; remark?: string },
) {
  const response = await apiClient.post<{ success: boolean; data: unknown }>(
    `/deposit/${depositId}/exchange-action`,
    { action: "reject", reasonId: input.reasonId, remark: input.remark },
  );
  return response.data?.data;
}

export async function exchangeActionMarkNotSettled(depositId: string) {
  const response = await apiClient.post<{ success: boolean; data: unknown }>(
    `/deposit/${depositId}/exchange-action`,
    { action: "mark_not_settled" },
  );
  return response.data?.data;
}

export async function amendDeposit(depositId: string, input: DepositAmendInput): Promise<unknown> {
  const response = await apiClient.post<{ success: boolean; data: unknown }>(
    `/deposit/${depositId}/amend`,
    {
      ...input,
      entryAt: normalizeDateTimeInput(input.entryAt),
    },
  );
  return response.data?.data;
}

export async function deleteDeposit(depositId: string): Promise<unknown> {
  const response = await apiClient.delete<{ success: boolean; data: unknown }>(`/deposit/${depositId}`);
  return response.data?.data;
}

// ---------------------------------------------------------------------------
// CSV Import
// ---------------------------------------------------------------------------

export type DepositImportValidRow = {
  row: number;
  utr: string;
  amount: number;
  operatedCurrency: string;
  operatedAmount: number;
  exchangeRate: number;
  entryAt?: string;
  settlementAccountType: "bank" | "person";
  bankId?: string;
  bankAccountNumber?: string;
  bankDisplayLabel?: string;
  liabilityPersonId?: string;
  liabilityPersonName?: string;
  playerMongoId?: string;
  playerIdLabel?: string;
  bonusAmount?: number;
  totalAmount?: number;
};

export type DepositImportInvalidRow = {
  row: number;
  dateTime: string;
  settlementType: string;
  bankAccountNumber: string;
  liablePersonName: string;
  operatedCurrency: string;
  amount: string;
  exchangeRate: string;
  platformAmount: string;
  playerId: string;
  utr: string;
  errors: string[];
};

export type DepositImportCommitRowInput = {
  utr: string;
  amount: number;
  operatedCurrency: string;
  operatedAmount: number;
  exchangeRate: number;
  entryAt?: string;
  settlementAccountType: "bank" | "person";
  bankId?: string;
  liabilityPersonId?: string;
  playerMongoId?: string;
  bonusAmount?: number;
  totalAmount?: number;
};

export type DepositImportValidationResult = {
  summary: { total: number; valid: number; invalid: number; skipped: number };
  validRows: DepositImportValidRow[];
  invalidRows: DepositImportInvalidRow[];
};

export async function downloadDepositImportSample(
  format: "csv" | "xlsx" = "csv",
): Promise<Blob> {
  const response = await apiClient.get("/deposit/import/sample", {
    responseType: "blob",
    params: {
      ...(format === "xlsx" ? { format: "xlsx" } : {}),
      _: Date.now(),
    },
  });
  return response.data as Blob;
}

export async function validateDepositImport(file: File): Promise<DepositImportValidationResult> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<{ success: boolean; data: DepositImportValidationResult }>(
    "/deposit/import/validate",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data.data;
}

export async function commitDepositImport(
  rows: DepositImportCommitRowInput[],
): Promise<{ created: number; errors: Array<{ row: number; utr: string; error: string }> }> {
  const response = await apiClient.post<{
    success: boolean;
    data: { created: number; errors: Array<{ row: number; utr: string; error: string }> };
  }>("/deposit/import/commit", { rows });
  return response.data.data;
}

export async function createDepositImportJob(
  rows: DepositImportCommitRowInput[],
): Promise<{ jobId: string; status: string }> {
  const response = await apiClient.post<{ success: boolean; data: { jobId: string; status: string } }>(
    "/deposit/import/jobs",
    { rows },
    { timeout: 60_000 },
  );
  return response.data.data;
}

export async function getDepositImportJob(jobId: string): Promise<DepositImportJobSummary> {
  const response = await apiClient.get<{ success: boolean; data: DepositImportJobSummary }>(
    `/deposit/import/jobs/${encodeURIComponent(jobId)}`,
    { timeout: 30_000 },
  );
  return response.data.data;
}

export async function downloadDepositImportJobErrorCsv(
  jobId: string,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await apiClient.get<Blob>(`/deposit/import/jobs/${encodeURIComponent(jobId)}/errors.csv`, {
    responseType: "blob",
  });
  const contentDisposition = String(response.headers["content-disposition"] ?? "");
  const fileName = parseDispositionFileName(contentDisposition) ?? `deposit-import-errors-${jobId}.csv`;
  return { blob: response.data, fileName };
}

export async function streamDepositImportJobEvents(
  jobId: string,
  onProgress: (payload: DepositImportJobSummary) => void,
): Promise<() => void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Missing access token for realtime updates");
  }

  const controller = new AbortController();
  const response = await fetch(`${apiClient.defaults.baseURL}/deposit/import/jobs/${encodeURIComponent(jobId)}/events`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
    credentials: "include",
  });
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
          status: DepositImportJobSummary["status"];
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
