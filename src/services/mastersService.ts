import { apiClient } from "./apiClient";
import type { MasterField, MasterRegistryEntry } from "@/types/masters";

export async function fetchMastersRegistry(): Promise<MasterRegistryEntry[]> {
  const res = await apiClient.get<{ success: boolean; data: MasterRegistryEntry[] }>("/masters");
  return res.data.data ?? [];
}

export async function getMasterList(
  modelKey: string,
  params: Record<string, unknown>,
): Promise<{
  data: Record<string, unknown>[];
  meta: { total: number; page: number; pageSize: number };
  fields: MasterField[];
}> {
  const res = await apiClient.get<{
    success: boolean;
    data: Record<string, unknown>[];
    meta: { total: number; page: number; pageSize: number };
    fields: MasterField[];
  }>(`/masters/${encodeURIComponent(modelKey)}`, { params });
  return {
    data: res.data.data ?? [],
    meta: res.data.meta ?? { total: 0, page: 1, pageSize: 20 },
    fields: res.data.fields ?? [],
  };
}

export async function getMasterById(modelKey: string, id: string): Promise<Record<string, unknown>> {
  const res = await apiClient.get<{ success: boolean; data: Record<string, unknown> }>(
    `/masters/${encodeURIComponent(modelKey)}/${encodeURIComponent(id)}`,
  );
  return res.data.data ?? {};
}

export async function createMasterRecord(
  modelKey: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await apiClient.post<{ success: boolean; data: Record<string, unknown> }>(
    `/masters/${encodeURIComponent(modelKey)}`,
    body,
  );
  return res.data.data ?? {};
}

export async function updateMasterRecord(
  modelKey: string,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await apiClient.patch<{ success: boolean; data: Record<string, unknown> }>(
    `/masters/${encodeURIComponent(modelKey)}/${encodeURIComponent(id)}`,
    body,
  );
  return res.data.data ?? {};
}

export async function deleteMasterRecord(modelKey: string, id: string): Promise<void> {
  await apiClient.delete(`/masters/${encodeURIComponent(modelKey)}/${encodeURIComponent(id)}`);
}

/**
 * Normalized fetcher for PaginatedTableReference + useListingQueryStateReference.
 */
export async function listMastersNormalized(
  modelKey: string,
  params: Record<string, unknown>,
): Promise<{
  data: Record<string, unknown>[];
  meta: { total: number; page: number; pageSize: number };
  fields: MasterField[];
}> {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const qRaw = params.q != null && String(params.q).trim() !== "" ? String(params.q).trim() : undefined;
  const q = qRaw && qRaw.length > 200 ? qRaw.slice(0, 200) : qRaw;
  const visibility =
    params.visibility === "inactive" || params.visibility === "all"
      ? params.visibility
      : "active";
  let sortBy =
    params.sortBy != null && String(params.sortBy).trim() !== "" ? String(params.sortBy).trim() : undefined;
  if (sortBy && (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sortBy) || sortBy.length > 64)) {
    sortBy = undefined;
  }
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

  return getMasterList(modelKey, {
    page,
    limit,
    q,
    visibility,
    sortBy,
    sortOrder,
  });
}
