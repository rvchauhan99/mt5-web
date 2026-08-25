import type { ReactNode } from "react";

export type PaginatedTableReferenceColumn = Record<string, unknown>;

export type PaginatedTableReferenceProps = {
  columns?: PaginatedTableReferenceColumn[];
  fetcher?: (params: Record<string, unknown>) => Promise<unknown>;
  initialPage?: number;
  initialLimit?: number;
  showSearch?: boolean;
  moduleKey?: string | null;
  height?: string;
  initialSortBy?: string | null;
  initialSortOrder?: string | null;
  getRowKey?: (row: unknown) => string | number;
  onRowsChange?: ((rows: unknown[]) => void) | null;
  onTotalChange?: ((total: number) => void) | null;
  filterParams?: Record<string, unknown>;
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: string | null;
  sortOrder?: string | null;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (n: number) => void;
  onQChange?: (q: string) => void;
  onSortChange?: (field: string | null, order: string) => void;
  columnFilterValues?: Record<string, string>;
  onColumnFilterChange?: (key: string, value: string) => void;
  showPagination?: boolean;
  compactDensity?: boolean;
  rowDetailsRender?: ((row: unknown) => ReactNode) | null;
  onRowClick?: ((row: unknown) => void) | null;
  /** When set, the row whose `getRowKey(row)` equals this value gets a selection highlight. */
  selectedRowKey?: string | number | null;
  /** Optional extra CSS classes per row (merged into `<tr>`). */
  getRowClassName?: (row: unknown) => string | undefined;
  /** Increment to refetch current page without remounting the table. */
  reloadToken?: number;
};

declare function PaginatedTableReference(props: PaginatedTableReferenceProps): ReactNode;
export default PaginatedTableReference;
