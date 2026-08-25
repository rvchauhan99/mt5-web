"use client";

/**
 * Stub for vendored reference listing stack (PaginatedTableReference).
 * Returns null permissions so action columns render without module-specific perms.
 */
export function useAuth() {
  return {
    modulePermissions: null as Record<string, unknown> | null,
    currentModuleId: null as string | null,
    fetchPermissionForModule: async () => null,
    user: null as { modules?: unknown[] } | null,
  };
}
