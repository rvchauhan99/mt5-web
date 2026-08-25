"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { useExport } from "@/hooks/useExport";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { exportBanks, listBanksNormalized } from "@/services/bankService";
import { userService } from "@/services/userService";
import type { BankRow } from "@/types/bank";
import type { AutocompleteOption } from "@/components/common/AutocompleteField";
import { formatDateTimeForUser } from "@/lib/userTimezone";

const COLUMN_FILTER_KEYS = [
  "holderName",
  "holderName_op",
  "bankName",
  "bankName_op",
  "accountNumber",
  "accountNumber_op",
  "ifsc",
  "ifsc_op",
  "openingBalance",
  "openingBalance_to",
  "openingBalance_op",
  "status",
  "createdBy",
  "createdAt_from",
  "createdAt_to",
  "createdAt_op",
];

type ExchangeUserRow = {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
  name?: string;
};

function toOptionalFilterValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function buildUserLabel(row: ExchangeUserRow): string {
  const fullName = row.fullName?.trim();
  const username = row.username?.trim();
  const name = row.name?.trim();
  if (fullName && username) return `${fullName} (${username})`;
  if (fullName) return fullName;
  if (username) return username;
  return name || "";
}

function isLikelyMongoId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value.trim());
}

function createdByIdFromRow(createdBy: unknown): string {
  if (createdBy == null) return "";
  if (typeof createdBy === "object" && "_id" in (createdBy as object)) {
    return String((createdBy as { _id: unknown })._id ?? "");
  }
  return String(createdBy);
}

export function BankListClient() {
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    listingState;
  const [totalCount, setTotalCount] = useState(0);
  const [cachedUsers, setCachedUsers] = useState<Record<string, string>>({});

  const { exporting, handleExport } = useExport(exportBanks, {
    fileName: `banks-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      page: 1,
      limit: 10000,
      sortBy: (sortBy || "createdAt") as string,
      sortOrder: (sortOrder === "asc" ? "asc" : "desc") as "asc" | "desc",
      holderName: toOptionalFilterValue(filters.holderName || ""),
      holderName_op: toOptionalFilterValue(filters.holderName_op || ""),
      bankName: toOptionalFilterValue(filters.bankName || ""),
      bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
      accountNumber: toOptionalFilterValue(filters.accountNumber || ""),
      accountNumber_op: toOptionalFilterValue(filters.accountNumber_op || ""),
      ifsc: toOptionalFilterValue(filters.ifsc || ""),
      ifsc_op: toOptionalFilterValue(filters.ifsc_op || ""),
      openingBalance: toOptionalFilterValue(filters.openingBalance || ""),
      openingBalance_to: toOptionalFilterValue(filters.openingBalance_to || ""),
      openingBalance_op: toOptionalFilterValue(filters.openingBalance_op || ""),
      status: toOptionalFilterValue(filters.status || ""),
      createdBy: toOptionalFilterValue(filters.createdBy || ""),
      createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
      createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
      createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
    });
  }, [handleExport, filters, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;
    userService
      .list({ page: 1, limit: 500, sortBy: "fullName", sortOrder: "asc" })
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response?.data) ? (response.data as ExchangeUserRow[]) : [];
        setCachedUsers((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            const value = String(row._id ?? row.id ?? "").trim();
            const label = buildUserLabel(row);
            if (!value || !label) continue;
            next[value] = label;
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const loadCreatedByOptions = useCallback(
    async (query: string): Promise<AutocompleteOption[]> => {
      try {
        const response = await userService.list({
          q: query || undefined,
          page: 1,
          limit: 20,
          sortBy: "fullName",
          sortOrder: "asc",
        });
        const rows = Array.isArray(response?.data) ? (response.data as ExchangeUserRow[]) : [];
        const options = rows
          .map((row) => {
            const value = String(row._id ?? row.id ?? "").trim();
            const label = buildUserLabel(row);
            if (!value || !label) return null;
            return { value, label };
          })
          .filter((row): row is AutocompleteOption => row !== null);
        setCachedUsers((prev) => {
          const next = { ...prev };
          for (const option of options) next[option.value] = option.label;
          return next;
        });
        return options;
      } catch {
        return [];
      }
    },
    [],
  );

  const creatorNameById = useMemo(() => new Map(Object.entries(cachedUsers)), [cachedUsers]);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);

  const handleColumnFilterChange = useCallback(
    (key: string, value: string) => {
      if (key === "status" && value === "") {
        setFilter("status", "all");
        return;
      }
      setFilter(key, value);
    },
    [setFilter],
  );

  const fetcher = useCallback(async (params: Record<string, unknown>) => listBanksNormalized(params), []);

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "holderName",
        label: "Holder",
        render: (row: BankRow) => row.holderName,
        ...tableColumnPresets.nameCol,
        sortable: true,
        filterType: "text" as const,
        filterKey: "holderName",
        operatorKey: "holderName_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "bankName",
        label: "Bank",
        render: (row: BankRow) => row.bankName,
        ...tableColumnPresets.nameCol,
        sortable: true,
        filterType: "text" as const,
        filterKey: "bankName",
        operatorKey: "bankName_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "accountNumber",
        label: "Account",
        render: (row: BankRow) => row.accountNumber,
        minWidth: 140,
        sortable: true,
        filterType: "text" as const,
        filterKey: "accountNumber",
        operatorKey: "accountNumber_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "ifsc",
        label: "IFSC",
        render: (row: BankRow) => row.ifsc,
        minWidth: 110,
        sortable: true,
        filterType: "text" as const,
        filterKey: "ifsc",
        operatorKey: "ifsc_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "openingBalance",
        label: "Opening Balance",
        render: (row: BankRow) => row.openingBalance,
        sortable: true,
        minWidth: 150,
        filterType: "number" as const,
        filterKey: "openingBalance",
        filterKeyTo: "openingBalance_to",
        operatorKey: "openingBalance_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "closingBalanceActual",
        label: "Closing Balance",
        render: (row: BankRow) =>
          row.closingBalanceActual ?? row.currentBalance ?? row.openingBalance,
        sortable: false,
        minWidth: 150,
      },
      {
        field: "status",
        label: "Status",
        filterType: "select" as const,
        filterKey: "status",
        filterOptions: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "deactive" },
        ],
        ...tableColumnPresets.statusCol,
        render: (row: BankRow) => <TableStatusBadge status={row.status} />,
      },
      {
        field: "createdBy",
        label: "Created By",
        render: (row: BankRow) => {
          const fromApi = row.createdByName?.trim();
          if (fromApi) return fromApi;
          const uid = createdByIdFromRow(row.createdBy);
          const fromUserList = uid ? creatorNameById.get(uid) : undefined;
          if (fromUserList) return fromUserList;
          if (uid && !isLikelyMongoId(uid)) return uid;
          return "—";
        },
        minWidth: 170,
        filterType: "autocomplete" as const,
        filterKey: "createdBy",
        filterLoadOptions: loadCreatedByOptions,
        filterPlaceholder: "Search user",
        filterEmptyText: "No users found",
      },
      {
        field: "createdAt",
        label: "Created At",
        sortable: true,
        filterType: "date" as const,
        filterKey: "createdAt_from",
        filterKeyTo: "createdAt_to",
        operatorKey: "createdAt_op",
        ...tableColumnPresets.dateCol,
        render: (row: BankRow) => formatDateTimeForUser(row.createdAt),
      },
    ],
    [creatorNameById, loadCreatedByOptions],
  );

  return (
    <ListingPageContainer
      title="Bank / List"
      description="Search, filter and review all bank accounts."
      density="compact"
      fullWidth
      secondaryButtonLabel="Reset filters"
      onSecondaryClick={() => clearFilters({ keepQuickSearch: true })}
      exportButtonLabel="Export"
      onExportClick={onExportClick}
      exportDisabled={exporting}
    >
      <PaginatedTableReference
        columns={columns}
        fetcher={fetcher}
        height="calc(100vh - 200px)"
        showSearch={false}
        showPagination={false}
        onTotalChange={setTotalCount}
        columnFilterValues={columnFilterValues}
        onColumnFilterChange={handleColumnFilterChange}
        filterParams={{
          holderName: toOptionalFilterValue(filters.holderName || ""),
          holderName_op: toOptionalFilterValue(filters.holderName_op || ""),
          bankName: toOptionalFilterValue(filters.bankName || ""),
          bankName_op: toOptionalFilterValue(filters.bankName_op || ""),
          accountNumber: toOptionalFilterValue(filters.accountNumber || ""),
          accountNumber_op: toOptionalFilterValue(filters.accountNumber_op || ""),
          ifsc: toOptionalFilterValue(filters.ifsc || ""),
          ifsc_op: toOptionalFilterValue(filters.ifsc_op || ""),
          openingBalance: toOptionalFilterValue(filters.openingBalance || ""),
          openingBalance_to: toOptionalFilterValue(filters.openingBalance_to || ""),
          openingBalance_op: toOptionalFilterValue(filters.openingBalance_op || ""),
          status: toOptionalFilterValue(filters.status || ""),
          createdBy: toOptionalFilterValue(filters.createdBy || ""),
          createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
          createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
          createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
        }}
        page={page}
        limit={limit}
        sortBy={sortBy || "createdAt"}
        sortOrder={sortOrder || "desc"}
        onPageChange={(zeroBased) => setPage(zeroBased + 1)}
        onRowsPerPageChange={setLimit}
        onSortChange={(field, order) => setSort(field, order)}
      />
      <PaginationControlsReference
        page={page - 1}
        rowsPerPage={limit}
        totalCount={totalCount}
        onPageChange={(zeroBased) => setPage(zeroBased + 1)}
        onRowsPerPageChange={setLimit}
        rowsPerPageOptions={[10, 20, 50, 100, 200]}
      />
    </ListingPageContainer>
  );
}
