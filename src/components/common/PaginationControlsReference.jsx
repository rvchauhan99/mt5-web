"use client";

import { Button } from "@/components/ui/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

/**
 * Reference-style pagination: left = "Showing X to Y of Z entries";
 * right = [Previous] [ "Page X of Y" ] [Next] [N per page Select].
 * Default options [20, 50, 100, 200]. Use below table when showPagination=false on PaginatedTable.
 *
 * @param {number} page - 0-based current page
 * @param {number} rowsPerPage
 * @param {number} totalCount
 * @param {function(number): void} onPageChange - (0-based page) => {}
 * @param {function(number): void} onRowsPerPageChange - (limit) => {}
 * @param {number[]} [rowsPerPageOptions=[20, 50, 100, 200]]
 */
export default function PaginationControls({
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [20, 50, 100, 200],
}) {
  const from = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min((page + 1) * rowsPerPage, totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const currentPage1Based = totalCount === 0 ? 1 : page + 1;

  const effectiveRowsPerPageOptions = Array.from(
    new Set(
      [rowsPerPage, ...rowsPerPageOptions].filter(
        (v) => typeof v === "number" && !Number.isNaN(v)
      )
    )
  ).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2 py-1.5 bg-muted/20 rounded-md">
      <div className="text-muted-foreground text-xs sm:text-sm">
        Showing <span className="font-medium">{from}</span> to{" "}
        <span className="font-medium">{to}</span> of{" "}
        <span className="font-medium">{totalCount}</span> entries
      </div>
      <div className="flex flex-row items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 0}
            className="min-w-8! flex-1 sm:flex-initial gap-1 px-2"
          >
            <IconChevronLeft className="size-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <div className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
            Page <span className="font-medium">{currentPage1Based}</span> of{" "}
            <span className="font-medium">{totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={(page + 1) * rowsPerPage >= totalCount}
            className="min-w-8! flex-1 sm:flex-initial gap-1 px-2"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <IconChevronRight className="size-4" />
          </Button>
        </div>
        <Select
          value={rowsPerPage.toString()}
          onValueChange={(value) => onRowsPerPageChange(Number(value))}
        >
          <SelectTrigger size="sm" className="w-full sm:w-[120px] h-8">
            <SelectValue placeholder={`${rowsPerPage} per page`} />
          </SelectTrigger>
          <SelectContent>
            {effectiveRowsPerPageOptions.map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {n} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
