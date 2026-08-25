import type { AuditActor, AuditRow } from "@/types/financial";

export type UserPickRow = {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
};

export function buildUserLabel(row: UserPickRow): string {
  const fn = row.fullName?.trim();
  const un = row.username?.trim();
  if (fn && un) return `${fn} (${un})`;
  return fn || un || "";
}

export function formatAuditActor(row: AuditRow): string {
  const raw = row.actorId;
  if (raw && typeof raw === "object") {
    const a = raw as AuditActor;
    return buildUserLabel({ fullName: a.fullName, username: a.username });
  }
  if (typeof raw === "string" && raw.length > 0) return raw;
  return "—";
}

export function formatAuditDetails(row: AuditRow): string {
  const hasOld = row.oldValue && Object.keys(row.oldValue).length > 0;
  const hasNew = row.newValue && Object.keys(row.newValue).length > 0;
  if (!hasOld && !hasNew) return "—";
  const chunks: string[] = [];
  if (hasOld) chunks.push(`old ${JSON.stringify(row.oldValue).slice(0, 140)}`);
  if (hasNew) chunks.push(`new ${JSON.stringify(row.newValue).slice(0, 140)}`);
  const s = chunks.join(" · ");
  return s.length > 200 ? `${s.slice(0, 200)}…` : s;
}
