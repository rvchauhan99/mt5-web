"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import { 
  IconEye, 
  IconEdit, 
  IconTrash, 
  IconX, 
  IconFilter, 
  IconChevronDown, 
  IconChevronUp 
} from "@tabler/icons-react";
import PaginatedTableReference, {
  type PaginatedTableReferenceColumn,
} from "@/components/common/PaginatedTableReference";
import PaginationControlsReference from "@/components/common/PaginationControlsReference";
import { useListingQueryStateReference } from "@/hooks/useListingQueryStateReference";
import { tableColumnPresets } from "@/lib/tableStylePresets";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  deleteMasterRecord,
  fetchMastersRegistry,
  getMasterById,
  createMasterRecord,
  updateMasterRecord,
  listMastersNormalized,
} from "@/services/mastersService";
import type { MasterField, MasterRegistryEntry } from "@/types/masters";
import { MasterForm } from "./MasterForm";
import { cn } from "@/lib/cn";
import type { MasterModelKey } from "@/lib/mastersSchemas";
import { formatDateTimeForUser } from "@/lib/userTimezone";

const FILTER_KEYS = ["visibility"];

function rowId(row: Record<string, unknown>): string {
  return String(row._id ?? row.id ?? "");
}

function formatCell(field: MasterField, value: unknown): string {
  if (value == null) return "—";
  if (field.type === "BOOLEAN") return value ? "Yes" : "No";
  if (field.type === "DATE") {
    try {
      return formatDateTimeForUser(String(value));
    } catch {
      return String(value);
    }
  }
  const s = String(value);
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}

export function MastersPageClient() {
  const listingState = useListingQueryStateReference({
    defaultLimit: 20,
    filterKeys: FILTER_KEYS,
  });
  const {
    page,
    limit,
    q,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setLimit,
    setQ,
    setFilter,
    setSort,
    clearFilters,
  } = listingState;

  const [masters, setMasters] = useState<MasterRegistryEntry[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [selectedMaster, setSelectedMaster] = useState<MasterRegistryEntry | null>(null);
  const [masterSearch, setMasterSearch] = useState("");

  const [fields, setFields] = useState<MasterField[]>([]);
  const [tableKey, setTableKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let active = true;
    fetchMastersRegistry()
      .then((list) => {
        if (!active) return;
        setMasters(list);
        if (list.length > 0) {
          setSelectedMaster((prev) => prev ?? list[0]!);
        }
      })
      .catch(() => {
        toast.error("Failed to load masters list.");
      })
      .finally(() => {
        if (active) setLoadingMasters(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const setPageRef = useRef(setPage);
  setPageRef.current = setPage;

  useEffect(() => {
    setPageRef.current(1);
    setTableKey((k) => k + 1);
  }, [selectedMaster?.modelKey]);

  const filteredMasters = useMemo(() => {
    const q = masterSearch.trim().toLowerCase();
    if (!q) return masters;
    return masters.filter((m) => m.name.toLowerCase().includes(q));
  }, [masters, masterSearch]);

  const fetcher = useCallback(
    async (params: Record<string, unknown>) => {
      if (!selectedMaster) {
        return { data: [], meta: { total: 0, page: 1, pageSize: 20 } };
      }
      const result = await listMastersNormalized(selectedMaster.modelKey, params);
      setFields((prev) => {
        const next = result.fields;
        if (
          prev.length === next.length &&
          prev.every((p, i) => {
            const n = next[i];
            return p.name === n?.name && p.type === n?.type && p.required === n?.required;
          })
        ) {
          return prev;
        }
        return next;
      });
      return { data: result.data, meta: result.meta };
    },
    [selectedMaster],
  );

  const columns = useMemo<PaginatedTableReferenceColumn[]>(() => {
    const cols: PaginatedTableReferenceColumn[] = [
      {
        field: "_status",
        label: "Status",
        sortable: false,
        minWidth: 90,
        render: (row: Record<string, unknown>) => (row.deletedAt ? "Inactive" : "Active"),
      },
    ];
    for (const f of fields) {
      cols.push({
        ...tableColumnPresets.nameCol,
        field: f.name,
        label: f.name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim(),
        sortable: true,
        minWidth: 120,
        render: (row: Record<string, unknown>) => formatCell(f, row[f.name]),
      });
    }
    cols.push({
      field: "_actions",
      label: "Actions",
      sortable: false,
      minWidth: 200,
      render: (row: Record<string, unknown>) => {
        const id = rowId(row);
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => void openView(id)}
              startIcon={<IconEye size={14} />}
            >
              View
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => void openEdit(id)}
              disabled={Boolean(row.deletedAt)}
              startIcon={<IconEdit size={14} />}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-danger hover:text-danger hover:bg-red-50"
              onClick={() => void confirmDelete(id)}
              disabled={Boolean(row.deletedAt)}
              startIcon={<IconTrash size={14} />}
            >
              Delete
            </Button>
          </div>
        );
      },
    });
    return cols;
  }, [fields]);

  async function openView(id: string) {
    if (!selectedMaster) return;
    setRecordLoading(true);
    setShowView(true);
    try {
      const data = await getMasterById(selectedMaster.modelKey, id);
      setDetailRecord(data);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to load record."));
      setShowView(false);
    } finally {
      setRecordLoading(false);
    }
  }

  async function openEdit(id: string) {
    if (!selectedMaster) return;
    setRecordLoading(true);
    setEditingId(id);
    setShowEdit(true);
    try {
      const data = await getMasterById(selectedMaster.modelKey, id);
      setDetailRecord(data);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to load record."));
      setShowEdit(false);
      setEditingId(null);
    } finally {
      setRecordLoading(false);
    }
  }

  async function confirmDelete(id: string) {
    if (!selectedMaster) return;
    if (!window.confirm("Delete this record? It will be marked inactive.")) return;
    try {
      await deleteMasterRecord(selectedMaster.modelKey, id);
      toast.success("Record deleted.");
      setTableKey((k) => k + 1);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Delete failed."));
    }
  }

  const visibilityParam = filters.visibility || "active";
  const tableFilterParams = useMemo(() => ({ visibility: visibilityParam }), [visibilityParam]);

  const handleAddClick = async () => {
    if (!selectedMaster) return;
    if (fields.length === 0) {
      try {
        const r = await listMastersNormalized(selectedMaster.modelKey, {
          page: 1,
          limit: 1,
          visibility: "active",
        });
        setFields(r.fields);
      } catch (e) {
        toast.error(getApiErrorMessage(e, "Failed to load form fields."));
        return;
      }
    }
    setDetailRecord(null);
    setShowAdd(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <aside className="card flex w-full shrink-0 flex-col gap-3 p-3 lg:w-72">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Master types</h2>
          <p className="text-xs text-gray-500">Select a list to manage.</p>
        </div>
        <Input
          placeholder="Search…"
          value={masterSearch}
          onChange={(e) => setMasterSearch(e.target.value)}
          className="text-sm"
        />
        <nav className="max-h-[50vh] space-y-1 overflow-y-auto lg:max-h-[calc(100vh-220px)]">
          {loadingMasters ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            filteredMasters.map((m) => (
              <Button
                key={m.modelKey}
                type="button"
                variant={selectedMaster?.modelKey === m.modelKey ? "primary" : "ghost"}
                fullWidth
                onClick={() => setSelectedMaster(m)}
                className={cn(
                  "justify-start text-sm h-9",
                  selectedMaster?.modelKey === m.modelKey
                    ? "bg-[#142847] hover:bg-[#142847]/90"
                    : "text-gray-700 font-normal hover:bg-gray-100"
                )}
              >
                {m.name}
              </Button>
            ))
          )}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <ListingPageContainer
          title={selectedMaster ? `${selectedMaster.name}` : "Masters"}
          description="Add, edit and review master records. Use visibility to include inactive (soft-deleted) rows."
          density="compact"
          fullWidth
          addButtonLabel="Add"
          onAddClick={() => void handleAddClick()}
          secondaryButtonLabel="Reset filters"
          onSecondaryClick={() => clearFilters({ keepQuickSearch: true })}
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Visibility</span>
              <div className="w-40">
                <Select
                  value={visibilityParam}
                  onChange={(e) => setFilter("visibility", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="all">All</option>
                </Select>
              </div>
            </div>
          }
        >
          {!selectedMaster ? (
            <p className="text-sm text-gray-500">Select a master type.</p>
          ) : (
            <>
              <PaginatedTableReference
                key={`${selectedMaster.modelKey}-${tableKey}`}
                columns={columns}
                fetcher={fetcher}
                height="calc(100vh - 260px)"
                showSearch
                showPagination={false}
                onTotalChange={setTotalCount}
                getRowKey={(row: unknown) => rowId(row as Record<string, unknown>)}
                page={page}
                limit={limit}
                q={q}
                onQChange={setQ}
                sortBy={sortBy || "createdAt"}
                sortOrder={sortOrder || "desc"}
                onPageChange={(zeroBased) => setPage(zeroBased + 1)}
                onRowsPerPageChange={setLimit}
                onSortChange={(field, order) => setSort(field, order)}
                filterParams={tableFilterParams}
              />
              <PaginationControlsReference
                page={page - 1}
                rowsPerPage={limit}
                totalCount={totalCount}
                onPageChange={(zeroBased) => setPage(zeroBased + 1)}
                onRowsPerPageChange={setLimit}
                rowsPerPageOptions={[10, 20, 50, 100]}
              />
            </>
          )}
        </ListingPageContainer>
      </div>

      {showAdd && selectedMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add {selectedMaster.name}</h3>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => setShowAdd(false)}
              >
                <IconX size={18} />
              </Button>
            </div>
            {fields.length === 0 ? (
              <p className="text-sm text-gray-500">Loading form…</p>
            ) : (
              <MasterForm
                fields={fields}
                modelKey={selectedMaster.modelKey as MasterModelKey}
                formMode="create"
                requiredFields={selectedMaster.required_fields}
                onCancel={() => setShowAdd(false)}
                loading={submitting}
                onSubmit={async (payload) => {
                  setSubmitting(true);
                  try {
                    await createMasterRecord(selectedMaster.modelKey, payload);
                    toast.success("Created.");
                    setShowAdd(false);
                    setTableKey((k) => k + 1);
                  } catch (e) {
                    toast.error(getApiErrorMessage(e, "Create failed."));
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      {showEdit && selectedMaster && editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit {selectedMaster.name}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setShowEdit(false);
                  setEditingId(null);
                  setDetailRecord(null);
                }}
              >
                <IconX size={18} />
              </Button>
            </div>
            {recordLoading || !detailRecord ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <MasterForm
                fields={fields}
                modelKey={selectedMaster.modelKey as MasterModelKey}
                formMode="edit"
                defaultValues={detailRecord}
                requiredFields={selectedMaster.required_fields}
                onCancel={() => {
                  setShowEdit(false);
                  setEditingId(null);
                  setDetailRecord(null);
                }}
                loading={submitting}
                onSubmit={async (payload) => {
                  setSubmitting(true);
                  try {
                    await updateMasterRecord(selectedMaster.modelKey, editingId, payload);
                    toast.success("Updated.");
                    setShowEdit(false);
                    setEditingId(null);
                    setDetailRecord(null);
                    setTableKey((k) => k + 1);
                  } catch (e) {
                    toast.error(getApiErrorMessage(e, "Update failed."));
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      {showView && selectedMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">View {selectedMaster.name}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setShowView(false);
                  setDetailRecord(null);
                }}
              >
                <IconX size={18} />
              </Button>
            </div>
            {recordLoading || !detailRecord ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <MasterForm
                fields={fields}
                defaultValues={detailRecord}
                viewMode
                onCancel={() => {
                  setShowView(false);
                  setDetailRecord(null);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
