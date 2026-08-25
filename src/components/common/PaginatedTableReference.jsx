/* eslint-disable -- vendored from techhind-solar-web reference PaginatedTable */
"use client";

import * as React from "react";
import SearchInput from "@/components/common/SearchInputReference";
import PaginationControls from "@/components/common/PaginationControlsReference";
import { AutocompleteField } from "@/components/common/AutocompleteField";
import { Input } from "@/components/ui/shadcn/input";
import { Button, buttonVariants } from "@/components/ui/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import DateField from "@/components/common/DateFieldReference";
import { TABLE_REFERENCE_STYLES } from "@/utils/dataTableUtils";
import { FIELD_HEIGHT_CLASS_SMALL } from "@/utils/formConstants";
import { useAuth } from "@/hooks/useAuth";
import {
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronsRight,
  IconArrowUp,
  IconArrowDown,
  IconFilter,
  IconMenu2,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import {
  getOperatorsForFilterType,
  getDefaultOperator,
} from "@/lib/filterOperators";
import { Z_INDEX_LAYERS } from "@/utils/zIndexLayers";
import { cn } from "@/lib/utils";

/** Solid hover for sticky tbody cells — alpha tints (e.g. bg-green/5) let horizontally scrolled cells show through. */
const STICKY_ROW_HOVER_BG = "group-hover:bg-emerald-50 dark:group-hover:bg-muted";

const COLUMN_FILTER_DEBOUNCE_MS = 500;
const SEARCH_DEBOUNCE_MS = 500;
/** Stable empty object to avoid "Maximum update depth" when columnFilterValues defaults to {} */
const EMPTY_FILTERS = Object.freeze ? Object.freeze({}) : {};
const TABLE_SEARCH_PADDING = "0.5rem";
const TABLE_PAGINATION_PADDING = "0.5rem";

/** Shared background and height for all table column filter inputs (text, date, select) */
const TABLE_FILTER_INPUT_CLASS = "bg-white text-sm min-w-0";
const EMPTY_AUTOCOMPLETE_LOAD_OPTIONS = async () => [];
const Z_BODY_STICKY_BASE = Z_INDEX_LAYERS.tableStickyBody;
const Z_FILTER_STICKY_BASE = Z_INDEX_LAYERS.tableStickyFilter;
const Z_HEADER_STICKY_BASE = Z_INDEX_LAYERS.tableStickyHeader;
const getConfiguredColumnWidth = (column, fallbackWidth) => {
  if (typeof column?.stickyWidth === "number") return column.stickyWidth;
  if (typeof column?.width === "number") return column.width;
  if (typeof column?.minWidth === "number") return column.minWidth;
  return fallbackWidth;
};

/**
 * PaginatedTable (MUI TablePagination) - reusable
 * props:
 * - columns: [{ field, label, render?, sortable?, stickyLeft?: boolean, stickyWidth?: number (px) }]
 * - fetcher: async ({ page, limit, q, sortBy?, sortOrder?, ...filterParams }) => { data, meta }
 * - initialPage (1-based), initialLimit
 * - initialSortBy, initialSortOrder (optional default sorting)
 * - filterParams: object merged into fetcher params (when parent uses URL state)
 * - onRowClick(row): when provided, rows are clickable; skip when target is button/link
 * - selectedRowKey: when set, row whose getRowKey(row) matches gets extra highlight (e.g. selection)
 * - getRowClassName(row): optional extra class names per row (e.g. import-ready highlight)
 * - Controlled mode: pass page (1-based), limit, q, sortBy, sortOrder + onPageChange(0-based), onRowsPerPageChange, onQChange, onSortChange
 */
export default function PaginatedTable({
  columns = [],
  fetcher,
  initialPage = 1,
  initialLimit = 10,
  showSearch = true,
  moduleKey = null,
  height = "75vh",
  initialSortBy = null,
  initialSortOrder = null,
  getRowKey = (row) => row.id || Math.random(),
  onRowsChange = null,
  onTotalChange = null,
  filterParams = {},
  onRowClick = null,
  selectedRowKey = null,
  getRowClassName = null,
  // Controlled mode (from useListingQueryState)
  page: controlledPage,
  limit: controlledLimit,
  q: controlledQ,
  sortBy: controlledSortBy,
  sortOrder: controlledSortOrder,
  onPageChange: onControlledPageChange,
  onRowsPerPageChange: onControlledRowsPerPageChange,
  onQChange: onControlledQChange,
  onSortChange: onControlledSortChange,
  // Per-column filter row (floating filters under headers)
  columnFilterValues = EMPTY_FILTERS,
  onColumnFilterChange = null,
  // When false, parent renders PaginationControls below; table still uses page/limit/onPageChange/onRowsPerPageChange
  showPagination = true,
  compactDensity = false,
  rowDetailsRender = null,
  /** Increment to refetch current page without remounting (preserves filter autocomplete state). */
  reloadToken = 0,
}) {
  const hasRowDetails = typeof rowDetailsRender === "function";
  const [expandedRows, setExpandedRows] = React.useState(() => new Set());
  const hasColumnFilters = Boolean(onColumnFilterChange);
  const filterDebounceRef = React.useRef({});
  const pendingFilterRef = React.useRef({});
  const debouncedColumnFilterChange = React.useCallback(
    (key, value) => {
      pendingFilterRef.current[key] = value;
      if (filterDebounceRef.current[key]) {
        clearTimeout(filterDebounceRef.current[key]);
      }
      filterDebounceRef.current[key] = setTimeout(() => {
        onColumnFilterChange?.(key, value);
        delete filterDebounceRef.current[key];
        delete pendingFilterRef.current[key];
      }, COLUMN_FILTER_DEBOUNCE_MS);
    },
    [onColumnFilterChange]
  );

  const handleOperatorChange = React.useCallback(
    (operatorKeyOrFilterKey, operator) => {
      const key = operatorKeyOrFilterKey.endsWith("_op")
        ? operatorKeyOrFilterKey
        : operatorKeyOrFilterKey + "_op";
      onColumnFilterChange?.(key, operator);
    },
    [onColumnFilterChange]
  );
  React.useEffect(() => () => {
    Object.values(filterDebounceRef.current || {}).forEach((t) => clearTimeout(t));
  }, []);

  const isControlled =
    controlledPage !== undefined &&
    controlledLimit !== undefined &&
    onControlledPageChange &&
    onControlledRowsPerPageChange;

  const [rows, setRows] = React.useState([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [internalPage, setInternalPage] = React.useState(initialPage - 1);
  const [internalRowsPerPage, setInternalRowsPerPage] = React.useState(initialLimit);
  const [query, setQuery] = React.useState(isControlled ? controlledQ ?? "" : "");
  const [debouncedQuery, setDebouncedQuery] = React.useState(isControlled ? controlledQ ?? "" : "");
  const [searchDisplayValue, setSearchDisplayValue] = React.useState(controlledQ ?? "");
  const searchDebounceRef = React.useRef(null);
  const [internalSortBy, setInternalSortBy] = React.useState(initialSortBy);
  const [internalSortOrder, setInternalSortOrder] = React.useState(initialSortOrder || "desc");

  const [localFilterValues, setLocalFilterValues] = React.useState(columnFilterValues);

  const onColumnFilterChangeRef = React.useRef(onColumnFilterChange);
  React.useEffect(() => {
    onColumnFilterChangeRef.current = onColumnFilterChange;
  }, [onColumnFilterChange]);

  const autocompleteFilterChangeHandlersRef = React.useRef(new Map());
  const getAutocompleteFilterChangeHandler = React.useCallback((filterKey) => {
    const cache = autocompleteFilterChangeHandlersRef.current;
    if (!cache.has(filterKey)) {
      cache.set(filterKey, (nextVal) => {
        const normalized = nextVal ?? "";
        setLocalFilterValues((prev) => ({ ...prev, [filterKey]: normalized }));
        onColumnFilterChangeRef.current?.(filterKey, normalized);
      });
    }
    return cache.get(filterKey);
  }, []);

  const page = isControlled ? Math.max(0, (controlledPage ?? 1) - 1) : internalPage;
  const rowsPerPage = isControlled ? (controlledLimit ?? initialLimit) : internalRowsPerPage;
  const sortBy = isControlled ? (controlledSortBy ?? null) : internalSortBy;
  const sortOrder = isControlled ? (controlledSortOrder ?? "desc") : internalSortOrder;
  const qDisplay = isControlled ? searchDisplayValue : query;
  const setQDisplay = isControlled && onControlledQChange
    ? (e) => {
      const v = typeof e === "object" && e?.target ? e.target.value : e;
      setSearchDisplayValue(v ?? "");
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        onControlledQChange?.(v ?? "");
        searchDebounceRef.current = null;
      }, SEARCH_DEBOUNCE_MS);
    }
    : setQuery;
  const { modulePermissions, currentModuleId, fetchPermissionForModule, user } =
    useAuth();
  const [resolvedPerms, setResolvedPerms] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    const loadPerm = async () => {
      if (!moduleKey) {
        setResolvedPerms(null);
        return;
      }
      const modules = user?.modules || [];

      const matchPredicate = (m) => {
        if (!m) return false;
        const key = m.key || "";
        return (
          key === moduleKey ||
          m.route === moduleKey ||
          key === moduleKey.replace(/[-\s]/g, "_") ||
          key === moduleKey.replace(/\//g, "_")
        );
      };

      const findModuleRecursive = (list) => {
        for (const mod of list || []) {
          if (matchPredicate(mod)) return mod;
          if (mod.submodules && mod.submodules.length) {
            const found = findModuleRecursive(mod.submodules);
            if (found) return found;
          }
        }
        return null;
      };

      const mod = findModuleRecursive(modules);
      if (!mod || !mod.id) {
        setResolvedPerms(null);
        return;
      }
      const cached = modulePermissions?.[mod.id];
      if (cached) {
        setResolvedPerms(cached);
        return;
      }
      try {
        const perms = await fetchPermissionForModule(mod.id);
        if (mounted) setResolvedPerms(perms);
      } catch (err) {
        if (mounted) setResolvedPerms(null);
      }
    };
    loadPerm();
    return () => {
      mounted = false;
    };
  }, [moduleKey, user, fetchPermissionForModule, modulePermissions]);

  const normalize = (res) => {
    if (!res) return { data: [], total: 0, page: 1 };
    if (Array.isArray(res)) return { data: res, total: res.length, page: 1 };
    // common shape: { data: [...], meta: { total, page, pages, limit } }
    if (res.data && res.meta)
      return {
        data: res.data,
        total: res.meta.total || 0,
        page: res.meta.page || 1,
      };
    // sendSuccess uses { status, message, result }
    if (res.result && Array.isArray(res.result))
      return { data: res.result, total: res.result.length, page: 1 };
    if (res.result && res.result.data)
      return {
        data: res.result.data,
        total: res.result.meta?.total || 0,
        page: res.result.meta?.page || 1,
      };
    if (res.rows && Array.isArray(res.rows))
      return {
        data: res.rows,
        total: res.count || res.rows.length,
        page: res.page || 1,
      };
    return { data: [], total: 0, page: 1 };
  };

  // Debounce the query (uncontrolled only) - update debouncedQuery after user stops typing for 500ms
  React.useEffect(() => {
    if (isControlled) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, isControlled]);

  // When controlled, sync search display from prop (e.g. URL load, back button)
  React.useEffect(() => {
    if (isControlled && controlledQ !== undefined) {
      setSearchDisplayValue(controlledQ ?? "");
      setQuery(controlledQ ?? "");
      setDebouncedQuery(controlledQ ?? "");
    }
  }, [isControlled, controlledQ]);

  // Sync local filter values from parent (e.g. URL load, back button)
  // Merge pending (in-progress typing) over columnFilterValues to avoid overwriting
  // Use stringified key to avoid infinite loop when parent passes inline {} or new object each render
  const columnFilterValuesKey = React.useMemo(
    () => JSON.stringify(columnFilterValues ?? EMPTY_FILTERS),
    [columnFilterValues]
  );
  React.useEffect(() => {
    setLocalFilterValues((prev) => ({
      ...(columnFilterValues ?? EMPTY_FILTERS),
      ...pendingFilterRef.current,
    }));
  }, [columnFilterValuesKey]);

  React.useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  // Use ref to store latest fetcher to avoid recreating load function
  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Use ref to track loading state to prevent concurrent loads
  const loadingRef = React.useRef(false);

  const effectiveQ = isControlled ? (controlledQ ?? "") : debouncedQuery;
  const filterParamsRef = React.useRef(filterParams);
  React.useEffect(() => {
    filterParamsRef.current = filterParams;
  }, [filterParams]);

  const filterParamsKey = React.useMemo(
    () => JSON.stringify(filterParams ?? {}),
    [filterParams]
  );

  const load = React.useCallback(
    async (p = page, l = rowsPerPage, q = effectiveQ, sBy = sortBy, sOrder = sortOrder) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      try {
        const apiPage = p + 1;
        const fetcherParams = {
          page: apiPage,
          limit: l,
          q: q || undefined,
          ...filterParamsRef.current,
        };
        if (sBy) {
          fetcherParams.sortBy = sBy;
          fetcherParams.sortOrder = sOrder;
        }
        const res = await fetcherRef.current(fetcherParams);
        const { data, total } = normalize(res);
        const rowsData = data || [];
        setRows(rowsData);
        const resolvedTotal = total || (rowsData ? rowsData.length : 0);
        setTotalCount(resolvedTotal);
        if (onTotalChange) onTotalChange(resolvedTotal);
        // Notify parent component about rows change
        if (onRowsChange && typeof onRowsChange === 'function') {
          onRowsChange(rowsData);
        }
      } catch (err) {
        console.error("PaginatedTable load error:", err);
        setRows([]);
        setTotalCount(0);
        if (onTotalChange) onTotalChange(0);
        // Notify parent component about rows change (empty array)
        if (onRowsChange && typeof onRowsChange === 'function') {
          onRowsChange([]);
        }
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [page, rowsPerPage, effectiveQ, sortBy, sortOrder, onRowsChange, onTotalChange]
  );

  // Reset to first page when debounced query changes (uncontrolled only)
  React.useEffect(() => {
    if (isControlled) return;
    if (page !== 0) setInternalPage(0);
  }, [debouncedQuery, isControlled]);

  React.useEffect(() => {
    load(page, rowsPerPage, debouncedQuery, sortBy, sortOrder);
  }, [page, rowsPerPage, debouncedQuery, sortBy, sortOrder, load, filterParamsKey, reloadToken]);

  const handleChangePage = (event, newPage) => {
    if (isControlled && onControlledPageChange) {
      onControlledPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handleChangeRowsPerPage = (event) => {
    const v = parseInt(event.target.value, 10);
    if (isControlled && onControlledRowsPerPageChange) {
      onControlledRowsPerPageChange(v);
      if (onControlledPageChange) onControlledPageChange(0);
    } else {
      setInternalRowsPerPage(v);
      setInternalPage(0);
    }
  };

  const reload = () => load(page, rowsPerPage, debouncedQuery, sortBy, sortOrder);

  const handleSortClick = (field) => {
    if (sortBy === field) {
      if (sortOrder === "asc") {
        const nextOrder = "desc";
        if (isControlled && onControlledSortChange) onControlledSortChange(field, nextOrder);
        else setInternalSortOrder(nextOrder);
      } else {
        if (isControlled && onControlledSortChange) onControlledSortChange(null, "asc");
        else {
          setInternalSortBy(null);
          setInternalSortOrder("asc");
        }
      }
    } else {
      if (isControlled && onControlledSortChange) onControlledSortChange(field, "desc");
      else {
        setInternalSortBy(field);
        setInternalSortOrder("desc");
      }
    }
  };

  /** Cumulative horizontal sticky offsets for columns with stickyLeft, or legacy [0] when first column is Actions. */
  const leftStickyInfo = React.useMemo(() => {
    const hasExplicit = columns.some((c) => c.stickyLeft === true);
    let indices;
    if (hasExplicit) {
      indices = columns.map((c, i) => (c.stickyLeft ? i : -1)).filter((i) => i >= 0);
    } else {
      const firstIsAction =
        columns[0] &&
        (columns[0].isActionColumn ||
          columns[0].field === "actions" ||
          columns[0].field === "action");
      indices = firstIsAction ? [0] : [];
    }
    let acc = 0;
    const byIndex = {};
    indices.forEach((colIndex, rank) => {
      const c = columns[colIndex];
      const isAction = c.isActionColumn || c.field === "actions" || c.field === "action";
      const w = getConfiguredColumnWidth(c, isAction ? 120 : 96);
      const isLastInGroup = rank === indices.length - 1;
      byIndex[colIndex] = {
        left: acc,
        zIndex: Z_BODY_STICKY_BASE + (indices.length - rank),
        shadow: isLastInGroup,
        width: w,
      };
      acc += w;
    });
    return byIndex;
  }, [columns]);

  const emptyRows = Math.max(
    0,
    (1 + page) * rowsPerPage - (rows ? rows.length : 0)
  );

  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
  const from = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min((page + 1) * rowsPerPage, totalCount);
  const toggleRowExpand = (rowKey) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  return (
    <div
      className="flex flex-col w-full max-w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      style={{ height }}
    >
      {showSearch && (
        <div className="shrink-0 p-1.5">
          <SearchInput
            placeholder="Search"
            value={qDisplay}
            onChange={(e) => setQDisplay(e.target.value)}
            fullWidth
          />
        </div>
      )}

      <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto border-y border-border w-full max-w-full [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
        <table
          className={cn("w-full table-auto", compactDensity ? "min-w-full" : "min-w-max")}
          aria-label="paginated table"
        >
          <thead className="sticky top-0 z-[30] isolate">
            <tr className="bg-[#1b365d] text-white relative z-[30]">
              {hasRowDetails && (
                <th
                  className={cn(
                    compactDensity ? "px-1 py-0.5" : "px-1.5 py-1",
                    "text-left font-semibold text-xs uppercase tracking-wide border-b border-[#1b365d] min-w-[32px] w-[32px] border-r border-white/20"
                  )}
                />
              )}
              {columns.map((c, colIndex) => {
                const isSortable = c.sortable === true;
                const isActiveSort = sortBy === c.field;
                const isActionColumn = c.isActionColumn || c.field === "actions" || c.field === "action";
                const isFirstColumn = colIndex === 0;
                const isLastColumn = colIndex === columns.length - 1;
                const sl = leftStickyInfo[colIndex];
                const configuredWidth = getConfiguredColumnWidth(c, isActionColumn ? 120 : 96);
                return (
                  <th
                    key={c.field || c.label}
                    onClick={isSortable ? () => handleSortClick(c.field) : undefined}
                    className={cn(
                      compactDensity ? "text-left font-semibold px-1 py-0.5 text-[11px] uppercase tracking-wide border-b border-[#1b365d] whitespace-nowrap" : "text-left font-semibold px-1.5 py-1 text-xs uppercase tracking-wide border-b border-[#1b365d] whitespace-nowrap",
                      isLastColumn ? "" : "border-r border-white/20",
                      isSortable && "cursor-pointer hover:bg-[#142847]",
                      isActionColumn && "whitespace-normal",
                      !isActionColumn && "overflow-hidden text-ellipsis",
                      sl && "sticky bg-[#1b365d]",
                      sl?.shadow && "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]",
                      isLastColumn && isActionColumn && "sticky right-0 bg-[#1b365d] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                    )}
                    style={{
                      ...(sl
                        ? { left: sl.left, zIndex: Z_HEADER_STICKY_BASE + sl.zIndex, minWidth: sl.width, width: sl.width }
                        : {}),
                      ...(isLastColumn && isActionColumn ? { right: 0, zIndex: Z_HEADER_STICKY_BASE + 1, width: configuredWidth, minWidth: configuredWidth } : { zIndex: Z_HEADER_STICKY_BASE }),
                      ...(typeof c.width === "number" ? { width: c.width } : {}),
                      ...(typeof c.minWidth === "number" ? { minWidth: c.minWidth } : {}),
                      maxWidth: !isActionColumn && c.maxWidth ? c.maxWidth : undefined,
                    }}
                  >
                    <div className="flex items-center gap-0.5">
                      {c.headerRender ? c.headerRender() : <span>{c.label}</span>}
                      {isSortable && (
                        <span className="inline-flex flex-col -my-0.5">
                          <IconArrowUp
                            className={cn(
                              "size-3",
                              isActiveSort && sortOrder === "asc" ? "opacity-100" : "opacity-40"
                            )}
                          />
                          <IconArrowDown
                            className={cn(
                              "size-3 -mt-0.5",
                              isActiveSort && sortOrder === "desc" ? "opacity-100" : "opacity-40"
                            )}
                          />
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
            {hasColumnFilters && (
              <tr
                data-ptr-filter-row
                className="bg-[#f8fafc] relative z-[20] [&_td]:py-0.5 [&_td]:px-1 [&_td]:align-middle [&_td]:border-b [&_td]:border-border"
              >
                {hasRowDetails && <td className="min-w-[32px] w-[32px]" />}
                {columns.map((c, colIndex) => {
                  const filterKey = c.filterKey ?? c.field;
                  const operatorKey = c.operatorKey ?? filterKey + "_op";
                  const value = localFilterValues[filterKey] ?? "";
                  const filterType = c.filterType;
                  const isActionColumn = c.isActionColumn || c.field === "actions" || c.field === "action";
                  const sl = leftStickyInfo[colIndex];
                  const isLastColumn = colIndex === columns.length - 1;
                  const configuredWidth = getConfiguredColumnWidth(c, isActionColumn ? 120 : 96);
                  if (isActionColumn || !filterType) {
                    const stickyClass = cn(
                      sl && "sticky bg-[#f8fafc]",
                      sl?.shadow && "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
                      isLastColumn && isActionColumn &&
                        "sticky right-0 bg-[#f8fafc] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                    );
                    return (
                      <td
                        key={(c.field || c.label) + "-filter"}
                        className={cn(stickyClass)}
                        style={
                          sl || (isLastColumn && isActionColumn)
                            ? {
                                ...(sl ? { left: sl.left, zIndex: Z_FILTER_STICKY_BASE + sl.zIndex, minWidth: sl.width, width: sl.width } : {}),
                                ...(isLastColumn && isActionColumn ? { right: 0, zIndex: Z_FILTER_STICKY_BASE + 1, minWidth: configuredWidth, width: configuredWidth } : {}),
                              }
                            : { zIndex: Z_FILTER_STICKY_BASE, ...(typeof c.width === "number" ? { width: c.width } : {}), ...(typeof c.minWidth === "number" ? { minWidth: c.minWidth } : {}) }
                        }
                      />
                    );
                  }
                  const opKey = operatorKey;
                  const operatorValue =
                    columnFilterValues[opKey] ??
                    c.defaultFilterOperator ??
                    getDefaultOperator(filterType);
                  const operators =
                    filterType === "text" || filterType === "date" || filterType === "number"
                      ? getOperatorsForFilterType(filterType)
                      : [];
                  const showOperatorDropdown =
                    (filterType === "text" || filterType === "date" || filterType === "number") && operators.length > 0;
                  const filterKeyTo = c.filterKeyTo;
                  const valueTo = filterKeyTo ? (localFilterValues[filterKeyTo] ?? "") : "";
                  const autocompleteLoadOptions =
                    typeof c.filterLoadOptions === "function"
                      ? c.filterLoadOptions
                      : EMPTY_AUTOCOMPLETE_LOAD_OPTIONS;

                  const OperatorDropdown = showOperatorDropdown ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "h-8 w-8 shrink-0"
                        )}
                        aria-label="Filter operator"
                      >
                        <IconMenu2 className="size-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {operators.map((op) => (
                          <DropdownMenuItem
                            key={op.value}
                            onClick={() => handleOperatorChange(operatorKey, op.value)}
                            className={cn(
                              operatorValue === op.value && "bg-accent"
                            )}
                          >
                            {op.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null;

                  const slFilter = leftStickyInfo[colIndex];
                  return (
                    <td
                      key={(c.field || c.label) + "-filter"}
                      data-ptr-filter-type={filterType}
                      data-ptr-filter-key={String(filterKey)}
                      className={cn(
                        "min-w-0",
                        slFilter && "sticky bg-[#f8fafc]",
                        slFilter?.shadow && "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
                        isLastColumn && isActionColumn && "sticky right-0 bg-[#f8fafc] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                      )}
                      style={{
                        ...(typeof c.width === "number" ? { width: c.width } : {}),
                        ...(typeof c.minWidth === "number" ? { minWidth: c.minWidth } : {}),
                        ...(c.maxWidth ? { maxWidth: c.maxWidth } : {}),
                        ...(slFilter
                          ? {
                              left: slFilter.left,
                              zIndex: Z_FILTER_STICKY_BASE + slFilter.zIndex,
                              minWidth: Math.max(typeof c.minWidth === "number" ? c.minWidth : 0, slFilter.width),
                              width: slFilter.width,
                            }
                          : {}),
                        ...(isLastColumn && isActionColumn ? { right: 0, zIndex: Z_FILTER_STICKY_BASE + 1, minWidth: configuredWidth, width: configuredWidth } : {}),
                      }}
                    >
                      <div data-ptr-filter-row-inner className="flex w-full min-w-0 items-center gap-1">
                        {filterType === "text" && (
                          <>
                            <Input
                              name={`filter-${filterKey}`}
                              value={value}
                              onChange={(e) => {
                                const v = e.target.value;
                                setLocalFilterValues((prev) => ({ ...prev, [filterKey]: v }));
                                debouncedColumnFilterChange(filterKey, v);
                              }}
                              className={cn(
                                FIELD_HEIGHT_CLASS_SMALL,
                                compactDensity ? "min-w-0 flex-1 py-0 px-1 text-xs" : "min-w-0 flex-1 py-1",
                                TABLE_FILTER_INPUT_CLASS
                              )}
                              placeholder=""
                            />
                            {OperatorDropdown}
                          </>
                        )}
                        {filterType === "date" && (
                          <>
                            <div data-ptr-filter-stack className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <DateField
                                name={`filter-${filterKey}`}
                                label=""
                                value={value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLocalFilterValues((prev) => ({ ...prev, [filterKey]: v }));
                                  debouncedColumnFilterChange(filterKey, v);
                                }}
                                size="small"
                                fullWidth
                                className={TABLE_FILTER_INPUT_CLASS}
                              />
                              {operatorValue === "inRange" && filterKeyTo && (
                                <DateField
                                  name={`filter-${filterKeyTo}`}
                                  label=""
                                  value={valueTo}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setLocalFilterValues((prev) => ({ ...prev, [filterKeyTo]: v }));
                                    debouncedColumnFilterChange(filterKeyTo, v);
                                  }}
                                  size="small"
                                  fullWidth
                                  className={TABLE_FILTER_INPUT_CLASS}
                                />
                              )}
                            </div>
                            {OperatorDropdown}
                          </>
                        )}
                        {filterType === "number" && (
                          <>
                            <div data-ptr-filter-stack className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <Input
                                type="number"
                                name={`filter-${filterKey}`}
                                value={value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLocalFilterValues((prev) => ({ ...prev, [filterKey]: v }));
                                  debouncedColumnFilterChange(filterKey, v);
                                }}
                                placeholder=""
                                className={cn(
                                  FIELD_HEIGHT_CLASS_SMALL,
                                  compactDensity ? "min-w-0 w-full py-0 px-1 text-xs" : "min-w-0 w-full py-1",
                                  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                  TABLE_FILTER_INPUT_CLASS
                                )}
                              />
                              {operatorValue === "between" && filterKeyTo && (
                                <Input
                                  type="number"
                                  name={`filter-${filterKeyTo}`}
                                  value={valueTo}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setLocalFilterValues((prev) => ({ ...prev, [filterKeyTo]: v }));
                                    debouncedColumnFilterChange(filterKeyTo, v);
                                  }}
                                  placeholder="To"
                                  className={cn(
                                    FIELD_HEIGHT_CLASS_SMALL,
                                    compactDensity ? "min-w-0 w-full py-0 px-1 text-xs" : "min-w-0 w-full py-1",
                                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                    TABLE_FILTER_INPUT_CLASS
                                  )}
                                />
                              )}
                            </div>
                            {OperatorDropdown}
                          </>
                        )}
                        {filterType === "select" && (
                          <div className="flex min-w-0 flex-1">
                            <Select
                              value={value || "__all__"}
                              onValueChange={(v) => {
                                const nextVal = v === "__all__" ? "" : v;
                                setLocalFilterValues((prev) => ({ ...prev, [filterKey]: nextVal }));
                                onColumnFilterChange(filterKey, nextVal);
                              }}
                            >
                              <SelectTrigger className={cn(FIELD_HEIGHT_CLASS_SMALL, compactDensity ? "w-full min-w-0 px-1 text-xs" : "w-full min-w-0", TABLE_FILTER_INPUT_CLASS)}>
                                <SelectValue placeholder="All">
                                  {value ? (c.filterOptions?.find((o) => o.value === value)?.label ?? value) : "All"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">All</SelectItem>
                                {(c.filterOptions || []).map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {filterType === "autocomplete" && (
                          <div className="flex-1 min-w-0">
                            <AutocompleteField
                              value={value || ""}
                              onChange={getAutocompleteFilterChangeHandler(filterKey)}
                              loadOptions={autocompleteLoadOptions}
                              placeholder={c.filterPlaceholder || "Search..."}
                              emptyText={c.filterEmptyText || "No records found"}
                              debounceMs={typeof c.filterDebounceMs === "number" ? c.filterDebounceMs : 300}
                            />
                          </div>
                        )}
                        {!showOperatorDropdown && filterType !== "autocomplete" && (
                          <IconFilter className="size-4 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            )}
          </thead>
          <tbody className="relative z-0">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (hasRowDetails ? 1 : 0)} className="text-center py-6 bg-card">
                  <div className="flex justify-center">
                    <div className="size-6 animate-spin rounded-full border-2 border-[#00823b] border-t-transparent" />
                  </div>
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row) => {
                const rowKey = getRowKey(row);
                const isExpanded = expandedRows.has(rowKey);
                const selectedKey =
                  selectedRowKey != null && selectedRowKey !== ""
                    ? String(selectedRowKey)
                    : null;
                const isSelected =
                  selectedKey != null && String(rowKey) === selectedKey;
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={
                        onRowClick
                          ? (e) => {
                            if (e.target.closest?.("button, [role='button'], a")) return;
                            onRowClick(row);
                          }
                          : undefined
                      }
                      className={cn(
                        onRowClick ? "cursor-pointer" : "",
                        isSelected &&
                          "bg-emerald-50/90 ring-1 ring-inset ring-emerald-200/80 dark:bg-muted/50 dark:ring-border",
                        typeof getRowClassName === "function" ? getRowClassName(row) : "",
                        "group hover:bg-[#00823b]/5 transition-colors border-b border-border last:border-b-0"
                      )}
                    >
                      {hasRowDetails && (
                        <td
                          className={cn(
                            compactDensity ? "px-1 py-0.5" : "px-1.5 py-1",
                            "border-b border-border text-sm text-foreground min-w-[32px] w-[32px]"
                          )}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(compactDensity ? "size-6" : "size-7")}
                            onClick={() => toggleRowExpand(rowKey)}
                            aria-label={isExpanded ? "Collapse row details" : "Expand row details"}
                          >
                            {isExpanded ? <IconChevronDown className="size-4" /> : <IconChevronRight className="size-4" />}
                          </Button>
                        </td>
                      )}
                      {columns.map((c, colIndex) => {
                        const isActionColumn = c.isActionColumn || c.field === "actions" || c.field === "action";
                        const isLastColumn = colIndex === columns.length - 1;
                        const sl = leftStickyInfo[colIndex];
                        const isRightSticky = isLastColumn && isActionColumn;
                        const configuredWidth = getConfiguredColumnWidth(c, isActionColumn ? 120 : 96);
                        const isStickyCell = Boolean(sl) || isRightSticky;
                        return (
                          <td
                            key={(c.field || c.label) + rowKey}
                            className={cn(
                              compactDensity ? "px-1 py-0.5 text-xs" : "px-1.5 py-1 text-sm",
                              "border-b border-border text-foreground",
                              isActionColumn && "overflow-visible whitespace-normal",
                              !isActionColumn &&
                                !c.wrap &&
                                "overflow-hidden text-ellipsis whitespace-nowrap",
                              !isActionColumn && c.wrap && "max-w-[220px] overflow-visible whitespace-normal break-words",
                              isStickyCell &&
                                cn(
                                  "sticky bg-card [background-clip:padding-box]",
                                  STICKY_ROW_HOVER_BG,
                                  sl?.shadow && "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]",
                                  isRightSticky && "right-0 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]"
                                ),
                              !isStickyCell &&
                                isActionColumn &&
                                "bg-card group-hover:bg-[#00823b]/5"
                            )}
                            style={{
                              ...(sl
                                ? { left: sl.left, zIndex: Z_BODY_STICKY_BASE + sl.zIndex, minWidth: sl.width, width: sl.width }
                                : {}),
                              ...(isRightSticky
                                ? { right: 0, zIndex: Z_BODY_STICKY_BASE + 1, ...(sl ? {} : { minWidth: configuredWidth, width: configuredWidth }) }
                                : {}),
                              ...(typeof c.width === "number" ? { width: c.width } : {}),
                              ...(typeof c.minWidth === "number" ? { minWidth: c.minWidth } : {}),
                              maxWidth: !isActionColumn && c.maxWidth ? c.maxWidth : undefined,
                            }}
                          >
                            {c.render
                              ? c.render(
                                row,
                                reload,
                                resolvedPerms ?? modulePermissions?.[currentModuleId]
                              )
                              : row[c.field]}
                          </td>
                        );
                      })}
                    </tr>
                    {hasRowDetails && isExpanded && (
                      <tr className="bg-muted/30 border-b border-border">
                        <td colSpan={columns.length + 1} className={compactDensity ? "px-2 py-1" : "px-3 py-2"}>
                          {rowDetailsRender(row)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + (hasRowDetails ? 1 : 0)} className="text-center py-6 text-muted-foreground bg-card">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <PaginationControls
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={(p) => handleChangePage(null, p)}
          onRowsPerPageChange={(v) => handleChangeRowsPerPage({ target: { value: v } })}
        />
      )}
    </div>
  );
}