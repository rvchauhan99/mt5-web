import { apiClient } from "./apiClient";
import type { ExpenseAnalysisFilterParams, ExpenseAnalysisSummary } from "./expenseService";
import type {
  BalanceSheetCompareMode,
  BalanceSheetData,
  BalanceSheetDrilldownRow,
  BalanceSheetGroupOption,
  BalanceSheetQueryParams,
} from "@/types/balanceSheet";

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

function buildBalanceSheetQueryParams(
  params?: BalanceSheetQueryParams,
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  if (!params) return out;
  if (params.fromDate) out.fromDate = params.fromDate;
  if (params.toDate) out.toDate = params.toDate;
  if (params.exchangeId) out.exchangeId = params.exchangeId;
  if (params.groupId) out.groupId = params.groupId;
  if (params.groupCode) out.groupCode = params.groupCode;
  if (params.currency) out.currency = params.currency;
  if (params.compare) out.compare = params.compare;
  if (params.showZeroBalances != null) out.showZeroBalances = params.showZeroBalances;
  if (params.includeSubGroups != null) out.includeSubGroups = params.includeSubGroups;
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

  balanceSheet: async (
    params: BalanceSheetQueryParams,
    signal?: AbortSignal,
  ): Promise<BalanceSheetData> => {
    const res = await apiClient.get<{ success?: boolean; data?: BalanceSheetData }>(
      "/reports/balance-sheet",
      {
        params: buildBalanceSheetQueryParams(params),
        signal,
      },
    );
    if (!res.data?.data) {
      throw new Error("Failed to load balance sheet");
    }
    return res.data.data;
  },

  balanceSheetSummary: async (params: BalanceSheetQueryParams, signal?: AbortSignal) => {
    const res = await apiClient.get("/reports/balance-sheet/summary", {
      params: buildBalanceSheetQueryParams(params),
      signal,
    });
    return res.data?.data;
  },

  balanceSheetGroups: async (): Promise<BalanceSheetGroupOption[]> => {
    const res = await apiClient.get<{ success?: boolean; data?: BalanceSheetGroupOption[] }>(
      "/reports/balance-sheet/groups",
    );
    return Array.isArray(res.data?.data) ? res.data.data : [];
  },

  balanceSheetDrilldown: async (params: {
    fromDate: string;
    toDate: string;
    exchangeId?: string;
    ledgerId: string;
    ledgerType: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    rows: BalanceSheetDrilldownRow[];
    meta: { page: number; pageSize: number; total: number };
  }> => {
    const res = await apiClient.get("/reports/balance-sheet/drilldown", { params });
    return {
      rows: Array.isArray(res.data?.data) ? res.data.data : [],
      meta: res.data?.meta ?? { page: 1, pageSize: 50, total: 0 },
    };
  },

  exportBalanceSheet: async (params: BalanceSheetQueryParams) => {
    const res = await apiClient.get("/reports/balance-sheet/export", {
      params: buildBalanceSheetQueryParams(params),
      responseType: "blob",
    });
    return res.data as Blob;
  },

  createBalanceSheetSnapshot: async (body: {
    fromDate: string;
    toDate: string;
    exchangeId?: string;
    note?: string;
  }) => {
    const res = await apiClient.post("/reports/balance-sheet/snapshot", body);
    return res.data?.data;
  },
};

export type { BalanceSheetCompareMode };
