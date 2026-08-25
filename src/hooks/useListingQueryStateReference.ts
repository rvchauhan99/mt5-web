"use client";

import { useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEBOUNCE_MS = 450;

function parseIntSafe(str: string | null, defaultVal: number): number {
  if (str == null || str === "") return defaultVal;
  const n = parseInt(str, 10);
  return Number.isNaN(n) ? defaultVal : n;
}

type Options = {
  defaultLimit?: number;
  filterKeys?: string[];
};

/**
 * URL-driven listing state matching techhind purchase-orders contract:
 * page is 1-based in the URL; filters are flat string values per key.
 */
export function useListingQueryStateReference(options: Options = {}) {
  const { defaultLimit = 10, filterKeys = [] } = options;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const page = parseIntSafe(searchParams.get("page"), 1);
  const limit = parseIntSafe(searchParams.get("limit"), defaultLimit);
  const q = searchParams.get("q") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    filterKeys.forEach((key) => {
      f[key] = searchParams.get(key) ?? "";
    });
    return f;
  }, [filterKeys, searchParams]);

  const buildSearchParams = useCallback(
    (updates: Record<string, string | undefined | null>) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value == null) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      return next;
    },
    [searchParams],
  );

  const setPage = useCallback(
    (p: number) => {
      const next = buildSearchParams({ page: p <= 1 ? undefined : String(p) });
      router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [pathname, router, buildSearchParams],
  );

  const setLimit = useCallback(
    (l: number) => {
      const next = buildSearchParams({ limit: String(l), page: undefined });
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, buildSearchParams],
  );

  const setQ = useCallback(
    (value: string, debounce = true) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const update = () => {
        const next = buildSearchParams({ q: value || undefined, page: undefined });
        router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
      };

      if (debounce) {
        debounceTimerRef.current = setTimeout(update, DEBOUNCE_MS);
      } else {
        update();
      }
    },
    [pathname, router, buildSearchParams],
  );

  const setSort = useCallback(
    (by: string | null, order: string) => {
      const next = buildSearchParams({
        sortBy: by || undefined,
        sortOrder: order || undefined,
      });
      router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [pathname, router, buildSearchParams],
  );

  const setFilters = useCallback(
    (newFilters: Record<string, string>, resetPage = true, debounce = false) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const update = () => {
        const next = new URLSearchParams(searchParams?.toString() ?? "");
        if (resetPage) next.delete("page");
        Object.entries(newFilters).forEach(([key, value]) => {
          if (value === "" || value == null) next.delete(key);
          else next.set(key, String(value));
        });
        if (next.get("limit") == null && limit != null) next.set("limit", String(limit));
        const hasQInUpdates = Object.prototype.hasOwnProperty.call(newFilters || {}, "q");
        if (next.get("q") == null && !hasQInUpdates && q != null && q !== "") next.set("q", q);
        if (next.get("sortBy") == null && sortBy) next.set("sortBy", sortBy);
        if (next.get("sortOrder") == null && sortOrder) next.set("sortOrder", sortOrder);
        router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
      };

      if (debounce) {
        debounceTimerRef.current = setTimeout(update, DEBOUNCE_MS);
      } else {
        update();
      }
    },
    [pathname, router, searchParams, limit, q, sortBy, sortOrder],
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      const nextFilters = { ...filters, [key]: value };
      setFilters(nextFilters);
    },
    [filters, setFilters],
  );

  const clearFilters = useCallback(
    (options?: { keepQuickSearch?: boolean }) => {
      const keepQuickSearch =
        options == null ||
        (typeof options === "object" && options.keepQuickSearch !== false);
      const next = new URLSearchParams();
      next.set("limit", String(limit));
      if (keepQuickSearch && q) next.set("q", q);
      if (sortBy) next.set("sortBy", sortBy);
      if (sortOrder) next.set("sortOrder", sortOrder);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, limit, q, sortBy, sortOrder],
  );

  return {
    page,
    limit,
    q,
    sortBy: sortBy || null,
    sortOrder: sortOrder || "desc",
    filters,
    setPage,
    setLimit,
    setQ,
    setFilters,
    setFilter,
    setSort,
    clearFilters,
  };
}
