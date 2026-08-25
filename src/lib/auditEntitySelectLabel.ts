import { AUDIT_ENTITY_AUTH } from "@/lib/constants/auditEntities";

/** Display label for audit entity option in filters (API stores short `entity` strings). */
export function formatAuditEntityOptionLabel(entity: string): string {
  if (entity === AUDIT_ENTITY_AUTH) return "auth — login activity";
  return entity;
}
