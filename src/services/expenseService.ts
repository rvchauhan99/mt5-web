import { formatYyyyMmDdInTimeZone, resolveUserTimeZone } from "@/lib/userTimezone";
import { apiClient } from "./apiClient";
import type {
  ExpenseApproveInput,
  ExpenseCreateInput,
  ExpenseDocumentMeta,
  ExpenseRow,
  ExpenseTypeOption,
  ExpenseUpdateInput,
} from "@/types/expense";

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

function parseExpenseTypeName(row: Record<string, unknown>): string {
  const et = row.expenseTypeId;
  if (et && typeof et === "object" && et !== null) {
    const o = et as Record<string, unknown>;
    return String(o.name ?? "");
  }
  return "";
}

export function normalizeExpense(row: Record<string, unknown>): ExpenseRow {
  const id = String(row._id ?? row.id ?? "");
  const st = row.status;
  const status: ExpenseRow["status"] =
    st === "approved" ||
    st === "rejected" ||
    st === "pending_audit" ||
    st === "cancelled"
      ? st
      : "pending_audit";

  const createdBy = row.createdBy;
  let createdByName: string | undefined;
  if (createdBy && typeof createdBy === "object" && createdBy !== null) {
    const u = createdBy as Record<string, unknown>;
    const fn = String(u.fullName ?? "").trim();
    const un = String(u.username ?? "").trim();
    createdByName = fn && un ? `${fn} (${un})` : fn || un || undefined;
  }

  const approvedBy = row.approvedBy;
  let approvedByName: string | undefined;
  if (approvedBy && typeof approvedBy === "object" && approvedBy !== null) {
    const u = approvedBy as Record<string, unknown>;
    const fn = String(u.fullName ?? "").trim();
    const un = String(u.username ?? "").trim();
    approvedByName = fn && un ? `${fn} (${un})` : fn || un || undefined;
  }

  const cancelledBy = row.cancelledBy;
  let cancelledByName: string | undefined;
  if (cancelledBy && typeof cancelledBy === "object" && cancelledBy !== null) {
    const u = cancelledBy as Record<string, unknown>;
    const fn = String(u.fullName ?? "").trim();
    const un = String(u.username ?? "").trim();
    cancelledByName = fn && un ? `${fn} (${un})` : fn || un || undefined;
  }

  let expenseDateStr: string | undefined;
  if (row.expenseDate != null) {
    const d = row.expenseDate instanceof Date ? row.expenseDate : new Date(String(row.expenseDate));
    if (!Number.isNaN(d.getTime())) {
      expenseDateStr = formatYyyyMmDdInTimeZone(d, resolveUserTimeZone());
    }
  }

  let bankId: string | undefined;
  const b = row.bankId;
  if (b && typeof b === "object" && b !== null && "_id" in b) {
    bankId = String((b as { _id?: unknown })._id);
  } else if (typeof b === "string") bankId = b;

  let liabilityPersonId: string | undefined;
  let liabilityPersonNameFromPopulate: string | undefined;
  const lp = row.liabilityPersonId;
  if (lp && typeof lp === "object" && lp !== null && "_id" in lp) {
    liabilityPersonId = String((lp as { _id?: unknown })._id);
    const populatedName = String((lp as { name?: string }).name ?? "").trim();
    if (populatedName) liabilityPersonNameFromPopulate = populatedName;
  } else if (lp != null) {
    liabilityPersonId = String(lp);
  }

  let liabilityEntryId: string | undefined;
  const le = row.liabilityEntryId;
  if (le && typeof le === "object" && le !== null && "_id" in le) {
    liabilityEntryId = String((le as { _id?: unknown })._id);
  } else if (le != null) {
    liabilityEntryId = String(le);
  }

  const createdById =
    row.createdBy && typeof row.createdBy === "object" && row.createdBy !== null && "_id" in row.createdBy
      ? String((row.createdBy as { _id?: unknown })._id)
      : typeof row.createdBy === "string"
        ? row.createdBy
        : undefined;

  const approvedById =
    row.approvedBy && typeof row.approvedBy === "object" && row.approvedBy !== null && "_id" in row.approvedBy
      ? String((row.approvedBy as { _id?: unknown })._id)
      : typeof row.approvedBy === "string"
        ? row.approvedBy
        : undefined;

  const cancelledById =
    row.cancelledBy && typeof row.cancelledBy === "object" && row.cancelledBy !== null && "_id" in row.cancelledBy
      ? String((row.cancelledBy as { _id?: unknown })._id)
      : typeof row.cancelledBy === "string"
        ? row.cancelledBy
        : undefined;

  let expenseTypeId: string | undefined;
  const et = row.expenseTypeId;
  if (et && typeof et === "object" && et !== null && "_id" in et) {
    expenseTypeId = String((et as { _id?: unknown })._id);
  } else if (typeof et === "string") expenseTypeId = et;

  const documentsRaw = Array.isArray(row.documents) ? row.documents : [];
  const documents: ExpenseDocumentMeta[] = documentsRaw
    .map((doc) => {
      if (!doc || typeof doc !== "object") return null;
      const d = doc as Record<string, unknown>;
      const path = String(d.path ?? "").trim();
      const filename = String(d.filename ?? "").trim();
      const size = Number(d.size ?? 0);
      const mimeType = String(d.mime_type ?? "").trim();
      const uploadedAt = String(d.uploaded_at ?? "").trim();
      if (!path || !filename || !mimeType || !uploadedAt || Number.isNaN(size) || size < 0) return null;
      return {
        path,
        filename,
        size,
        mime_type: mimeType,
        uploaded_at: uploadedAt,
      };
    })
    .filter((d): d is ExpenseDocumentMeta => d !== null);

  return {
    _id: id,
    id,
    expenseTypeId,
    expenseTypeName: parseExpenseTypeName(row) || expenseTypeId,
    amount: Number(row.amount ?? 0),
    expenseDate: expenseDateStr,
    description: String(row.description ?? "").trim() || undefined,
    bankId,
    bankName: String(row.bankName ?? "").trim(),
    settlementAccountType:
      row.settlementAccountType === "bank" || row.settlementAccountType === "person"
        ? row.settlementAccountType
        : undefined,
    liabilityPersonId,
    liabilityPersonName:
      String(row.liabilityPersonName ?? "").trim() || liabilityPersonNameFromPopulate || undefined,
    liabilityEntryId,
    status,
    rejectReason: row.rejectReason != null ? String(row.rejectReason) : undefined,
    cancelReason: row.cancelReason != null ? String(row.cancelReason) : undefined,
    bankBalanceAfter: row.bankBalanceAfter != null ? Number(row.bankBalanceAfter) : undefined,
    cancelledAt: row.cancelledAt != null ? String(row.cancelledAt) : undefined,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : undefined,
    createdByName,
    approvedByName,
    cancelledByName,
    createdBy: createdById,
    approvedBy: approvedById,
    cancelledBy: cancelledById,
    documents,
  };
}

export async function listExpenseTypes(): Promise<ExpenseTypeOption[]> {
  const res = await apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>(
    "/expense/expense-types",
  );
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  return rows.map((r) => ({
    _id: String(r._id ?? ""),
    name: String(r.name ?? ""),
    code: r.code != null ? String(r.code) : undefined,
    description: r.description != null ? String(r.description) : undefined,
    requiresAudit: (r.auditRequired as boolean | undefined) !== false,
  }));
}

export async function createExpense(input: ExpenseCreateInput): Promise<unknown> {
  const res = await apiClient.post<{ success: boolean; data: unknown }>("/expense", input);
  return res.data?.data;
}

export async function updateExpense(id: string, input: ExpenseUpdateInput): Promise<unknown> {
  const res = await apiClient.patch<{ success: boolean; data: unknown }>(`/expense/${id}`, input);
  return res.data?.data;
}

export async function uploadExpenseDocuments(expenseId: string, files: File[]): Promise<unknown> {
  const formData = new FormData();
  files.forEach((file) => formData.append("documents", file));
  const res = await apiClient.post<{ success: boolean; data: unknown }>(
    `/expense/${expenseId}/documents`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return res.data?.data;
}

export async function getExpenseDocumentViewUrl(
  expenseId: string,
  docIndex: number,
): Promise<{ url: string; filename?: string; mime_type?: string; uploaded_at?: string }> {
  const res = await apiClient.get<{
    success: boolean;
    data?: { url?: string; filename?: string; mime_type?: string; uploaded_at?: string };
  }>(`/expense/${expenseId}/documents/${docIndex}/view`);
  const data = res.data?.data;
  return {
    url: String(data?.url ?? ""),
    filename: data?.filename,
    mime_type: data?.mime_type,
    uploaded_at: data?.uploaded_at,
  };
}

export async function approveExpense(id: string, input: ExpenseApproveInput): Promise<unknown> {
  const res = await apiClient.post<{ success: boolean; data: unknown }>(`/expense/${id}/approve`, input);
  return res.data?.data;
}

export async function rejectExpense(
  id: string,
  input: { reasonId: string; remark?: string },
): Promise<unknown> {
  const res = await apiClient.post<{ success: boolean; data: unknown }>(`/expense/${id}/reject`, {
    reasonId: input.reasonId,
    remark: input.remark,
  });
  return res.data?.data;
}

export async function cancelApprovedExpense(
  id: string,
  input: { reasonId: string; remark?: string },
): Promise<unknown> {
  const res = await apiClient.post<{ success: boolean; data: unknown }>(`/expense/${id}/cancel`, {
    reasonId: input.reasonId,
    remark: input.remark,
  });
  return res.data?.data;
}

export async function exportExpenses(params: Record<string, unknown>): Promise<Blob> {
  const response = await apiClient.get("/expense/export", {
    params,
    responseType: "blob",
  });
  return response.data;
}

export type ExpenseAnalysisStatusBreakdown = {
  status: string;
  totalAmount: number;
  count: number;
};

export type ExpenseAnalysisSummary = {
  grandTotal: number;
  totalCount: number;
  netApprovedTotal: number;
  netApprovedCount: number;
  cancelledTotal: number;
  cancelledCount: number;
  pendingTotal: number;
  pendingCount: number;
  rejectedTotal: number;
  rejectedCount: number;
  byStatus: ExpenseAnalysisStatusBreakdown[];
  byExpenseType: Array<{
    expenseTypeId: string;
    name: string;
    totalAmount: number;
    count: number;
  }>;
};

/** Query fields shared by expense-analysis summary + records (matches API `expenseAnalysisFilterQuerySchema`). */
export type ExpenseAnalysisFilterParams = {
  search?: string;
  status?: string;
  expenseTypeId?: string;
  bankId?: string;
  expenseDate_from?: string;
  expenseDate_to?: string;
  expenseDate_op?: string;
  createdAt_from?: string;
  createdAt_to?: string;
  createdAt_op?: string;
  amount?: string;
  amount_to?: string;
  amount_op?: string;
  createdBy?: string;
  approvedBy?: string;
};

function buildExpenseAnalysisQueryParams(p: ExpenseAnalysisFilterParams): Record<string, string> {
  const out: Record<string, string> = {};
  (Object.entries(p) as [keyof ExpenseAnalysisFilterParams, string | undefined][]).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const t = String(v).trim();
    if (t !== "") out[k] = t;
  });
  return out;
}

export async function getExpenseAnalysisSummary(
  params: ExpenseAnalysisFilterParams & { signal?: AbortSignal },
): Promise<ExpenseAnalysisSummary> {
  const { signal, ...filter } = params;
  const res = await apiClient.get<{ success: boolean; summary: ExpenseAnalysisSummary }>(
    "/reports/expense-analysis/summary",
    {
      params: buildExpenseAnalysisQueryParams(filter),
      signal,
    },
  );
  return (
    res.data.summary ?? {
      grandTotal: 0,
      totalCount: 0,
      netApprovedTotal: 0,
      netApprovedCount: 0,
      cancelledTotal: 0,
      cancelledCount: 0,
      pendingTotal: 0,
      pendingCount: 0,
      rejectedTotal: 0,
      rejectedCount: 0,
      byStatus: [],
      byExpenseType: [],
    }
  );
}

export async function getExpenseAnalysisRecords(
  params: ExpenseAnalysisFilterParams & {
    page: number;
    pageSize: number;
    sortBy: "createdAt" | "expenseDate" | "amount" | "status" | "bankName";
    sortOrder: "asc" | "desc";
    signal?: AbortSignal;
  },
): Promise<{
  data: ExpenseRow[];
  meta: { total: number; page: number; pageSize: number };
}> {
  const { signal, page, pageSize, sortBy, sortOrder, ...filter } = params;
  const response = await apiClient.get<{
    success: boolean;
    data: Record<string, unknown>[];
    meta: { total: number; page: number; pageSize: number };
  }>("/reports/expense-analysis/records", {
    params: {
      ...buildExpenseAnalysisQueryParams(filter),
      page,
      pageSize,
      sortBy,
      sortOrder,
    },
    signal,
  });
  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const meta = response.data?.meta;
  return {
    data: rows.map((row) => normalizeExpense(row)),
    meta: {
      total: Number(meta?.total ?? 0),
      page: Number(meta?.page ?? page),
      pageSize: Number(meta?.pageSize ?? pageSize),
    },
  };
}

export async function listExpensesNormalized(params: Record<string, unknown>): Promise<{
  data: ExpenseRow[];
  meta: { total: number; page: number; pageSize: number };
}> {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const sortBy =
    (str(params, "sortBy") || "createdAt") as
      | "createdAt"
      | "expenseDate"
      | "amount"
      | "status"
      | "bankName";
  const sortOrder = str(params, "sortOrder") === "asc" ? "asc" : "desc";

  const response = await apiClient.get<{
    success: boolean;
    data: Record<string, unknown>[];
    meta: { total: number; page: number; pageSize: number };
  }>("/expense", {
    params: {
      page,
      pageSize: limit,
      sortBy,
      sortOrder,
      search: toOptionalParam(str(params, "q")) || undefined,
      status: toOptionalParam(str(params, "status")),
      expenseTypeId: toOptionalParam(str(params, "expenseTypeId")),
      bankId: toOptionalParam(str(params, "bankId")),
      amount: toOptionalParam(str(params, "amount")),
      amount_to: toOptionalParam(str(params, "amount_to")),
      amount_op: toOptionalParam(str(params, "amount_op")),
      createdBy: toOptionalParam(str(params, "createdBy")),
      approvedBy: toOptionalParam(str(params, "approvedBy")),
      createdAt_from: toOptionalParam(str(params, "createdAt_from")),
      createdAt_to: toOptionalParam(str(params, "createdAt_to")),
      createdAt_op: toOptionalParam(str(params, "createdAt_op")),
      expenseDate_from: toOptionalParam(str(params, "expenseDate_from")),
      expenseDate_to: toOptionalParam(str(params, "expenseDate_to")),
      expenseDate_op: toOptionalParam(str(params, "expenseDate_op")),
    },
  });

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const meta = response.data?.meta;
  return {
    data: rows.map((row) => normalizeExpense(row)),
    meta: {
      total: Number(meta?.total ?? 0),
      page: Number(meta?.page ?? page),
      pageSize: Number(meta?.pageSize ?? limit),
    },
  };
}
