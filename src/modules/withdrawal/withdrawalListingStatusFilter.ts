/**
 * Final list: URL `status` vs column select vs API (view=final has no default status filter).
 */
export function withdrawalStatusColumnSelectValue(status: string | undefined): string {
  const s = status ?? "";
  if (s === "all") return "";
  return s;
}

export function withdrawalStatusApiParam(status: string | undefined): string | undefined {
  const s = (status ?? "").trim();
  if (s === "all") return "all";
  if (s === "") return undefined;
  return s;
}
