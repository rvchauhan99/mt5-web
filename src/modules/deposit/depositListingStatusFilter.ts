/**
 * Banker/exchange deposit list: URL `status` vs column select vs API default (pending when absent).
 * - `all` → no status filter on the API; column select shows "All" (empty internal value).
 * - absent / empty → API defaults to pending; column select shows "Pending".
 */
export function depositStatusColumnSelectValue(status: string | undefined): string {
  const s = status ?? "";
  if (s === "all") return "";
  if (s === "" || s === "pending") return "pending";
  return s;
}

export function depositStatusApiParam(status: string | undefined): string | undefined {
  const s = (status ?? "").trim();
  if (s === "all") return "all";
  if (s === "") return undefined;
  return s;
}
