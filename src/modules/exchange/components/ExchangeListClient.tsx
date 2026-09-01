"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { exportExchanges, listExchangesNormalized } from "@/services/exchangeService";
import { userService } from "@/services/userService";
import type { Exchange } from "@/types/exchange";
import type { AutocompleteOption } from "@/components/common/AutocompleteField";
import { useExport } from "@/hooks/useExport";
import { formatDateTimeForUser } from "@/lib/userTimezone";
import { useFormatMoney } from "@/hooks/useFormatMoney";

const COLUMN_FILTER_KEYS = [
  "name",
  "name_op",
  "provider",
  "provider_op",
  "status",
  "createdBy",
  "createdAt_from",
  "createdAt_to",
  "createdAt_op",
  "openingBalance",
  "openingBalance_to",
  "openingBalance_op",
  "currentBalance",
  "currentBalance_to",
  "currentBalance_op",
  "bonus",
  "bonus_to",
  "bonus_op",
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

function displayCurrentBalance(row: Exchange, formatMoney: (value: number, options?: { includeSign?: boolean }) => string): string {
  const balance =
    row.currentBalance != null && Number.isFinite(row.currentBalance)
      ? row.currentBalance
      : row.openingBalance;
  return formatMoney(balance, { includeSign: true });
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

export function ExchangeListClient() {
  const { formatMoney } = useFormatMoney();
  const fmt = (value: number) => formatMoney(value, { includeSign: true });
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    listingState;

  const [totalCount, setTotalCount] = useState(0);
  const [cachedUsers, setCachedUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    userService
      .list({
        page: 1,
        limit: 500,
        sortBy: "fullName",
        sortOrder: "asc",
      })
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
          for (const option of options) {
            next[option.value] = option.label;
          }
          return next;
        });
        return options;
      } catch {
        return [];
      }
    },
    [],
  );

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const creatorNameById = useMemo(() => new Map(Object.entries(cachedUsers)), [cachedUsers]);

  const handleColumnFilterChange = useCallback(
    (key: string, value: string) => {
      setFilter(key, value);
    },
    [setFilter],
  );

  const fetcher = useCallback(async (params: Record<string, unknown>) => {
    return listExchangesNormalized(params);
  }, []);

  const { exporting, handleExport } = useExport((params) => exportExchanges(params), {
    fileName: `exchanges-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    const statusRaw = filters.status?.trim();
    const status =
      statusRaw === "active" || statusRaw === "deactive" ? statusRaw : undefined;
    handleExport({
      sortBy: (sortBy || "createdAt") as "createdAt" | "name" | "provider",
      sortOrder: (sortOrder === "asc" ? "asc" : "desc") as "asc" | "desc",
      name: toOptionalFilterValue(filters.name || ""),
      nameOp: toOptionalFilterValue(filters.name_op || ""),
      provider: toOptionalFilterValue(filters.provider || ""),
      providerOp: toOptionalFilterValue(filters.provider_op || ""),
      status,
      createdBy: toOptionalFilterValue(filters.createdBy || ""),
      createdAtFrom: toOptionalFilterValue(filters.createdAt_from || ""),
      createdAtTo: toOptionalFilterValue(filters.createdAt_to || ""),
      createdAtOp: toOptionalFilterValue(filters.createdAt_op || ""),
      openingBalance: toOptionalFilterValue(filters.openingBalance || ""),
      openingBalanceTo: toOptionalFilterValue(filters.openingBalance_to || ""),
      openingBalanceOp: toOptionalFilterValue(filters.openingBalance_op || ""),
      currentBalance: toOptionalFilterValue(filters.currentBalance || ""),
      currentBalanceTo: toOptionalFilterValue(filters.currentBalance_to || ""),
      currentBalanceOp: toOptionalFilterValue(filters.currentBalance_op || ""),
      bonus: toOptionalFilterValue(filters.bonus || ""),
      bonusTo: toOptionalFilterValue(filters.bonus_to || ""),
      bonusOp: toOptionalFilterValue(filters.bonus_op || ""),
    });
  }, [handleExport, filters, sortBy, sortOrder]);

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "name",
        label: "Exchange Name",
        render: (row: Exchange) => row.name,
        ...tableColumnPresets.nameCol,
        sortable: true,
        filterType: "text" as const,
        filterKey: "name",
        operatorKey: "name_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "provider",
        label: "Provider",
        render: (row: Exchange) => row.provider,
        sortable: true,
        minWidth: 180,
        filterType: "text" as const,
        filterKey: "provider",
        operatorKey: "provider_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "openingBalance",
        label: "Opening Balance",
        render: (row: Exchange) => fmt(row.openingBalance),
        sortable: true,
        minWidth: 150,
        filterType: "number" as const,
        filterKey: "openingBalance",
        filterKeyTo: "openingBalance_to",
        operatorKey: "openingBalance_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "currentBalance",
        label: "Current Balance",
        render: (row: Exchange) => displayCurrentBalance(row, formatMoney),
        sortable: false,
        minWidth: 150,
        filterType: "number" as const,
        filterKey: "currentBalance",
        filterKeyTo: "currentBalance_to",
        operatorKey: "currentBalance_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "bonus",
        label: "Bonus",
        render: (row: Exchange) => row.bonus,
        sortable: true,
        minWidth: 120,
        filterType: "number" as const,
        filterKey: "bonus",
        filterKeyTo: "bonus_to",
        operatorKey: "bonus_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "version",
        label: "Version",
        render: (row: Exchange) => row.version ?? "-",
        sortable: false,
        minWidth: 110,
      },
      {
        field: "createdBy",
        label: "Created By",
        render: (row: Exchange) => {
          const fromApi = row.createdByName?.trim();
          if (fromApi) return fromApi;
          const fromUserList = row.createdBy ? creatorNameById.get(row.createdBy) : undefined;
          if (fromUserList) return fromUserList;
          if (row.createdBy && !isLikelyMongoId(row.createdBy)) return row.createdBy;
          return "-";
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
        render: (row: Exchange) => formatDateTimeForUser(row.createdAt),
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
        render: (row: Exchange) => <TableStatusBadge status={row.status} />,
      },
    ],
    [creatorNameById, loadCreatedByOptions, formatMoney],
  );

  return (
    <ListingPageContainer
      title="Exchange / List"
      description="Search, filter and review all exchanges."
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
          name: toOptionalFilterValue(filters.name || ""),
          name_op: toOptionalFilterValue(filters.name_op || ""),
          provider: toOptionalFilterValue(filters.provider || ""),
          provider_op: toOptionalFilterValue(filters.provider_op || ""),
          status: toOptionalFilterValue(filters.status || ""),
          createdBy: toOptionalFilterValue(filters.createdBy || ""),
          createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
          createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
          createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
          openingBalance: toOptionalFilterValue(filters.openingBalance || ""),
          openingBalance_to: toOptionalFilterValue(filters.openingBalance_to || ""),
          openingBalance_op: toOptionalFilterValue(filters.openingBalance_op || ""),
          currentBalance: toOptionalFilterValue(filters.currentBalance || ""),
          currentBalance_to: toOptionalFilterValue(filters.currentBalance_to || ""),
          currentBalance_op: toOptionalFilterValue(filters.currentBalance_op || ""),
          bonus: toOptionalFilterValue(filters.bonus || ""),
          bonus_to: toOptionalFilterValue(filters.bonus_to || ""),
          bonus_op: toOptionalFilterValue(filters.bonus_op || ""),
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
