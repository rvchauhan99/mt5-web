export type { BankRow } from "./bank";

export type { DepositRow } from "./deposit";

export type { WithdrawalRow } from "./withdrawal";

export type AuditActor = {
  _id?: string;
  fullName?: string;
  username?: string;
};

export type AuditRow = {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  requestId?: string;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
  actorId?: string | AuditActor;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
};
