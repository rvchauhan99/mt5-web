import { apiClient } from "./apiClient";
import type { ExpenseAnalysisFilterParams, ExpenseAnalysisSummary } from "./expenseService";

function buildExpenseAnalysisQueryParams(
  params?: ExpenseAnalysisFilterParams,
): Record<string, string> {
  const entries = Object.entries(params ?? {});
  const out: Record<string, string> = {};
  entries.forEach(([key, value]) => {
    if (value == null) return;
    const trimmed = String(value).trim();
    if (trimmed) out[key] = trimmed;
  });
  return out;
}

export const reportService = {
  dashboardSummary: async (params?: {
    fromDate?: string;
    toDate?: string;
    exchangeId?: string;
    status?: string;
    transactionType?: string;
    playerId?: string;
    bankId?: string;
    amountFrom?: string;
    amountTo?: string;
    search?: string;
  }) => {
    const res = await apiClient.get("/reports/dashboard-summary", { params });
    return res.data;
  },
  transactionHistory: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get("/reports/transaction-history", { params });
    return res.data;
  },
  userHistory: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get("/history", { params });
    return res.data;
  },
  /** Entity dropdown options for Transaction History (requires `reports.transaction_history`). */
  transactionHistoryEntities: async () => {
    const res = await apiClient.get("/reports/audit-entities");
    return res.data as { success?: boolean; data?: string[] };
  },

  exportDashboardSummary: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get("/reports/dashboard-summary/export", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  expenseAnalysisSummary: async (
    params?: ExpenseAnalysisFilterParams & { signal?: AbortSignal },
  ): Promise<ExpenseAnalysisSummary> => {
    const { signal, ...queryParams } = params ?? {};
    const res = await apiClient.get<{ success?: boolean; summary?: ExpenseAnalysisSummary }>(
      "/reports/expense-analysis/summary",
      {
        params: buildExpenseAnalysisQueryParams(queryParams),
        signal: signal instanceof AbortSignal ? signal : undefined,
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
  },

  expenseAnalysisRecords: async (
    params?: ExpenseAnalysisFilterParams & {
      page?: number;
      pageSize?: number;
      sortBy?: "createdAt" | "expenseDate" | "amount" | "status" | "bankName";
      sortOrder?: "asc" | "desc";
      signal?: AbortSignal;
    },
  ) => {
    const { signal, ...queryParams } = params ?? {};
    const { page, pageSize, sortBy, sortOrder, ...filterParams } = queryParams;
    const res = await apiClient.get("/reports/expense-analysis/records", {
      params: {
        ...buildExpenseAnalysisQueryParams(filterParams),
        ...(typeof page === "number" ? { page } : {}),
        ...(typeof pageSize === "number" ? { pageSize } : {}),
        ...(sortBy ? { sortBy } : {}),
        ...(sortOrder ? { sortOrder } : {}),
      },
      signal: signal instanceof AbortSignal ? signal : undefined,
    });
    return res.data;
  },

  exportExpenseAnalysis: async (
    params?: ExpenseAnalysisFilterParams & {
      sortBy?: "createdAt" | "expenseDate" | "amount" | "status" | "bankName";
      sortOrder?: "asc" | "desc";
    },
  ) => {
    const res = await apiClient.get("/reports/expense-analysis/export", {
      params: buildExpenseAnalysisQueryParams(params),
      responseType: "blob",
    });
    return res.data;
  },

  exportTransactionHistory: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get("/reports/transaction-history/export", {
      params,
      responseType: "blob",
    });
    return res.data;
  },
};
