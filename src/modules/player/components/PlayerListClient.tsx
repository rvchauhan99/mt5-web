"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { exportPlayers, listPlayersNormalized } from "@/services/playerService";
import { userService } from "@/services/userService";
import type { PlayerRow } from "@/types/player";
import { formatDateTimeForUser } from "@/lib/userTimezone";
import type { AutocompleteOption } from "@/components/common/AutocompleteField";
import { useExport } from "@/hooks/useExport";

const COLUMN_FILTER_KEYS = [
  "playerId",
  "playerId_op",
  "phone",
  "phone_op",
  "userType",
  "userType_op",
  "exchangeName",
  "exchangeName_op",
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

function formatExchangeLabel(exchange: PlayerRow["exchange"]): string {
  if (exchange == null) return "—";
  if (typeof exchange === "string") return exchange;
  const name = exchange.name?.trim();
  const provider = exchange.provider?.trim();
  if (name && provider) return `${name} (${provider})`;
  return name || provider || "—";
}

function formatUserTypeLabel(userType: PlayerRow["userType"] | undefined): string {
  return userType === "ib" ? "IB" : "Trader";
}

export function PlayerListClient() {
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
    return listPlayersNormalized(params);
  }, []);

  const { exporting, handleExport } = useExport((params) => exportPlayers(params), {
    fileName: `traders-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      page: 1,
      limit: 10000,
      sortBy: (sortBy || "createdAt") as "createdAt" | "playerId" | "phone" | "userType",
      sortOrder: (sortOrder === "asc" ? "asc" : "desc") as "asc" | "desc",
      playerId: toOptionalFilterValue(filters.playerId || ""),
      playerId_op: toOptionalFilterValue(filters.playerId_op || ""),
      phone: toOptionalFilterValue(filters.phone || ""),
      phone_op: toOptionalFilterValue(filters.phone_op || ""),
      userType: toOptionalFilterValue(filters.userType || ""),
      userType_op: toOptionalFilterValue(filters.userType_op || ""),
      exchangeName: toOptionalFilterValue(filters.exchangeName || ""),
      exchangeName_op: toOptionalFilterValue(filters.exchangeName_op || ""),
      createdBy: toOptionalFilterValue(filters.createdBy || ""),
      createdAt_from: toOptionalFilterValue(filters.createdAt_from || ""),
      createdAt_to: toOptionalFilterValue(filters.createdAt_to || ""),
      createdAt_op: toOptionalFilterValue(filters.createdAt_op || ""),
    });
  }, [handleExport, filters, sortBy, sortOrder]);

  const columns = useMemo<PaginatedTableReferenceColumn[]>(
    () => [
      {
        field: "exchange",
        label: "Exchange",
        render: (row: PlayerRow) => formatExchangeLabel(row.exchange),
        ...tableColumnPresets.nameCol,
        sortable: false,
        filterType: "text" as const,
        filterKey: "exchangeName",
        operatorKey: "exchangeName_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "playerId",
        label: "Trader Wallet Id",
        render: (row: PlayerRow) => row.playerId,
        minWidth: 120,
        sortable: true,
        filterType: "text" as const,
        filterKey: "playerId",
        operatorKey: "playerId_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "phone",
        label: "Phone",
        render: (row: PlayerRow) => row.phone,
        minWidth: 120,
        sortable: true,
        filterType: "text" as const,
        filterKey: "phone",
        operatorKey: "phone_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "email",
        label: "Email",
        render: (row: PlayerRow) => row.email?.trim() || "—",
        minWidth: 160,
        sortable: false,
      },
      {
        field: "userType",
        label: "User type",
        render: (row: PlayerRow) => formatUserTypeLabel(row.userType),
        minWidth: 110,
        sortable: true,
        filterType: "select" as const,
        filterKey: "userType",
        operatorKey: "userType_op",
        defaultFilterOperator: "equals",
        filterOptions: [
          { label: "Trader", value: "trader" },
          { label: "IB", value: "ib" },
        ],
      },
      {
        field: "createdBy",
        label: "Created By",
        render: (row: PlayerRow) => {
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
        render: (row: PlayerRow) => formatDateTimeForUser(row.createdAt),
      },
    ],
    [creatorNameById, loadCreatedByOptions],
  );

  return (
    <ListingPageContainer
      title="Trader / List"
      description="Search, filter and review all exchange traders."
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
          playerId: toOptionalFilterValue(filters.playerId || ""),
          playerId_op: toOptionalFilterValue(filters.playerId_op || ""),
          phone: toOptionalFilterValue(filters.phone || ""),
          phone_op: toOptionalFilterValue(filters.phone_op || ""),
          userType: toOptionalFilterValue(filters.userType || ""),
          userType_op: toOptionalFilterValue(filters.userType_op || ""),
          exchangeName: toOptionalFilterValue(filters.exchangeName || ""),
          exchangeName_op: toOptionalFilterValue(filters.exchangeName_op || ""),
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
