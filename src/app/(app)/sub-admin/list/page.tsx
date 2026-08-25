"use client";

import { useState, useMemo, useCallback } from "react";
import { IconEye } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { DetailsSidebar } from "@/components/common/DetailsSidebar";
import { TableStatusBadge } from "@/components/common/TableStatusBadge";
import { userService } from "@/services/userService";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { formatDateTimeForUser } from "@/lib/userTimezone";

const FILTER_KEYS = ["fullName", "fullName_op", "username", "username_op", "email", "email_op", "role", "status"];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "deactive", label: "Inactive" },
];

export default function SubAdminListPage() {
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort, clearFilters } =
    useListingQueryStateReference({ defaultLimit: 20, filterKeys: FILTER_KEYS });

  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);

  const handleOpenSidebar = useCallback((row: any) => {
    setSelectedRecord(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await userService.exportUsers({
        status: filters.status,
        role: filters.role,
        fullName: filters.fullName,
        email: filters.email,
        username: filters.username,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sub-admins-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export users");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const fetcher = useCallback(
    async (params: Record<string, unknown>) => {
      return userService.list({
        page: params.page as number,
        limit: params.limit as number,
        sortBy: (params.sortBy as string) || "createdAt",
        sortOrder: (params.sortOrder as "asc" | "desc") || "desc",
        status: filters.status || undefined,
        role: filters.role || undefined,
        fullName: filters.fullName || undefined,
        email: filters.email || undefined,
        username: filters.username || undefined,
      });
    },
    [filters]
  );

  const filterParams = useMemo(
    () => ({
      status: filters.status || undefined,
      role: filters.role || undefined,
      fullName: filters.fullName || undefined,
      email: filters.email || undefined,
      username: filters.username || undefined,
    }),
    [filters]
  );

  const columns = useMemo(
    () => [
      {
        field: "fullName",
        label: "Name",
        sortable: true,
        filterType: "text" as const,
        filterKey: "fullName",
        operatorKey: "fullName_op",
        defaultFilterOperator: "contains",
        ...tableColumnPresets.nameCol,
      },
      {
        field: "username",
        label: "Username",
        sortable: true,
        filterType: "text" as const,
        filterKey: "username",
        operatorKey: "username_op",
        defaultFilterOperator: "contains",
      },
      {
        field: "email",
        label: "Email",
        sortable: true,
        filterType: "text" as const,
        filterKey: "email",
        operatorKey: "email_op",
        defaultFilterOperator: "contains",
        minWidth: 220,
        wrap: true,
      },
      {
        field: "role",
        label: "Role",
        sortable: true,
        filterType: "select" as const,
        filterKey: "role",
        filterOptions: [
          { value: "admin", label: "Admin" },
          { value: "sub_admin", label: "Sub Admin" },
        ],
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        filterType: "select" as const,
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        ...tableColumnPresets.statusCol,
        render: (row: any) => <TableStatusBadge status={row.status} />,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        ...tableColumnPresets.actionsCol,
        render: (row: any) => (
          <div className="flex gap-2">
            <Button size="icon" variant="secondary" className="h-8 w-8 text-blue-100" onClick={() => handleOpenSidebar(row)}>
              <IconEye className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenSidebar]
  );

  return (
    <div className="flex h-full flex-col">
      <ListingPageContainer
        title="Sub Admins"
        fullWidth
        secondaryButtonLabel="Reset filters"
        onSecondaryClick={() => clearFilters()}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <PaginatedTableReference
          columns={columns}
          fetcher={fetcher}
          filterParams={filterParams}
          height="calc(100vh - 210px)"
          showSearch={false}
          showPagination={false}
          onTotalChange={setTotalCount}
          columnFilterValues={columnFilterValues}
          onColumnFilterChange={setFilter}
          onRowClick={handleOpenSidebar}
          page={page}
          limit={limit}
          sortBy={sortBy || "createdAt"}
          sortOrder={sortOrder || "desc"}
          onPageChange={(zeroBased) => setPage(zeroBased + 1)}
          onRowsPerPageChange={setLimit}
          onSortChange={(field, order) => setSort(field, order as "asc" | "desc")}
          compactDensity
        />
        <PaginationControlsReference
          page={page - 1}
          rowsPerPage={limit}
          totalCount={totalCount}
          onPageChange={(zeroBased) => setPage(zeroBased + 1)}
          onRowsPerPageChange={setLimit}
          rowsPerPageOptions={[20, 50, 100, 200]}
        />
      </ListingPageContainer>

      <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="User Details">
        {selectedRecord && (
          <div className="space-y-3 p-4">
            <p className="font-semibold text-lg">{selectedRecord.fullName}</p>
            <p className="text-sm">{selectedRecord.email}</p>
            <p className="text-sm">Username: {selectedRecord.username}</p>
            <p className="text-sm">Role: {selectedRecord.role}</p>
            <hr className="border-border" />
            <p className="text-sm">Status: {selectedRecord.status}</p>
            <p className="text-sm">Created At: {formatDateTimeForUser(selectedRecord.createdAt)}</p>
            <p className="text-sm">Last Login: {selectedRecord.lastLoginAt ? formatDateTimeForUser(selectedRecord.lastLoginAt) : "Never"}</p>
          </div>
        )}
      </DetailsSidebar>
    </div>
  );
}
