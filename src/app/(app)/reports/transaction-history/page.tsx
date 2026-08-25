"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/shadcn/label";
import { AuditHistoryEntityFilter } from "@/components/common/AuditHistoryEntityFilter";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import PaginatedTableReference from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { formatAuditActor, formatAuditDetails, buildUserLabel, type UserPickRow } from "@/lib/auditRowFormat";
import { reportService } from "@/services/reportService";
import { userService } from "@/services/userService";
import { useExport } from "@/hooks/useExport";
import type { AuditRow } from "@/types/financial";
import { formatDateTimeForUser } from "@/lib/userTimezone";

export default function TransactionHistoryPage() {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");

  const [activeSearch, setActiveSearch] = useState("");
  const [activeFromDate, setActiveFromDate] = useState("");
  const [activeToDate, setActiveToDate] = useState("");
  const [activeEntity, setActiveEntity] = useState("");
  const [activeAction, setActiveAction] = useState("");
  const [activeActorId, setActiveActorId] = useState("");

  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const loadUserOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const response = await userService.list({
        q: query || undefined,
        page: 1,
        limit: 20,
        sortBy: "fullName",
        sortOrder: "asc",
      });
      const rows = Array.isArray(response?.data) ? (response.data as UserPickRow[]) : [];
      return rows
        .map((row) => ({
          value: String(row._id ?? row.id ?? "").trim(),
          label: buildUserLabel(row),
        }))
        .filter((o) => o.value.length > 0 && o.label.length > 0);
    } catch {
      return [];
    }
  }, []);

  const fetcher = useCallback(
    async (params: Record<string, unknown>) => {
      return reportService.transactionHistory({
        search: activeSearch || undefined,
        fromDate: activeFromDate || undefined,
        toDate: activeToDate || undefined,
        entity: activeEntity || undefined,
        action: activeAction || undefined,
        actorId: activeActorId || undefined,
        page: params.page as number,
        pageSize: params.limit as number,
      });
    },
    [activeSearch, activeFromDate, activeToDate, activeEntity, activeAction, activeActorId],
  );

  const filterParams = useMemo(
    () => ({
      search: activeSearch,
      fromDate: activeFromDate,
      toDate: activeToDate,
      entity: activeEntity,
      action: activeAction,
      actorId: activeActorId,
    }),
    [activeSearch, activeFromDate, activeToDate, activeEntity, activeAction, activeActorId],
  );

  const applyFilters = () => {
    setActiveSearch(search);
    setActiveFromDate(fromDate);
    setActiveToDate(toDate);
    setActiveEntity(entity);
    setActiveAction(action);
    setActiveActorId(actorId);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setEntity("");
    setAction("");
    setActorId("");
    setActiveActorId("");
    setPage(1);
  };

  const { exporting, handleExport } = useExport((params) => reportService.exportTransactionHistory(params), {
    fileName: `audit-history-${new Date().toISOString().split("T")[0]}.xlsx`,
  });

  const onExportClick = useCallback(() => {
    handleExport({
      search: activeSearch || undefined,
      fromDate: activeFromDate || undefined,
      toDate: activeToDate || undefined,
      entity: activeEntity || undefined,
      action: activeAction || undefined,
      actorId: activeActorId || undefined,
    });
  }, [handleExport, activeSearch, activeFromDate, activeToDate, activeEntity, activeAction, activeActorId]);

  const columns = useMemo(
    () => [
      {
        field: "createdAt",
        label: "Created at",
        render: (row: AuditRow) =>
          formatDateTimeForUser(row.createdAt),
        ...tableColumnPresets.dateCol,
        minWidth: 160,
      },
      {
        field: "actor",
        label: "User",
        render: (row: AuditRow) => formatAuditActor(row),
        ...tableColumnPresets.nameCol,
        minWidth: 140,
      },
      {
        field: "action",
        label: "Action",
        render: (row: AuditRow) => row.action,
        ...tableColumnPresets.nameCol,
      },
      {
        field: "entity",
        label: "Entity",
        render: (row: AuditRow) => row.entity,
        ...tableColumnPresets.nameCol,
      },
      {
        field: "entityId",
        label: "Entity ID",
        render: (row: AuditRow) => row.entityId || "—",
      },
      {
        field: "ipAddress",
        label: "User IP",
        render: (row: AuditRow) => row.ipAddress || "—",
        minWidth: 140,
      },
      {
        field: "details",
        label: "Details",
        render: (row: AuditRow) => {
          const text = formatAuditDetails(row);
          return (
            <span className="text-xs text-slate-600" title={text === "—" ? undefined : text}>
              {text}
            </span>
          );
        },
        minWidth: 200,
        wrap: true,
      },
    ],
    [],
  );

  return (
    <ListingPageContainer
      title="Reports / Transaction History"
      fullWidth
      density="compact"
      onExportClick={onExportClick}
      exportDisabled={exporting}
      exportButtonLabel="Export Log"
      filters={
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 uppercase tracking-tight">From</Label>
              <Input
                type="date"
                className="h-9 w-[150px] text-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 uppercase tracking-tight">To</Label>
              <Input
                type="date"
                className="h-9 w-[150px] text-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 uppercase tracking-tight">Search</Label>
              <Input
                className="h-9 max-w-[280px] text-sm"
                placeholder="Action, entity, ID, request id, IP"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <AuditHistoryEntityFilter value={entity} onChange={setEntity} />
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500 uppercase tracking-tight">Action</Label>
              <Input
                className="h-9 max-w-[140px] text-sm"
                placeholder="Contains"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>
            <div className="min-w-[220px] space-y-1">
              <Label className="text-[10px] text-slate-500 uppercase tracking-tight">Actor</Label>
              <AutocompleteField
                value={actorId}
                onChange={setActorId}
                loadOptions={loadUserOptions}
                placeholder="User…"
              />
            </div>
            <Button variant="secondary" className="h-9" type="button" onClick={applyFilters}>
              Apply
            </Button>
            <Button variant="ghost" className="h-9" type="button" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      }
    >
      <PaginatedTableReference
        columns={columns}
        fetcher={fetcher}
        filterParams={filterParams}
        height="calc(100vh - 280px)"
        showSearch={false}
        showPagination={false}
        onTotalChange={setTotalCount}
        page={page}
        limit={limit}
        onPageChange={(zeroBased) => setPage(zeroBased + 1)}
        onRowsPerPageChange={setLimit}
        compactDensity
      />
      <PaginationControlsReference
        page={page - 1}
        rowsPerPage={limit}
        totalCount={totalCount}
        onPageChange={(zeroBased) => setPage(zeroBased + 1)}
        onRowsPerPageChange={setLimit}
        rowsPerPageOptions={[20, 50, 100]}
      />
    </ListingPageContainer>
  );
}
