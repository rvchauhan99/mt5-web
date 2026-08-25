import type { DepositRow } from "@/types/deposit";

/** Pending deposit with player + bonus prefilled from import (ready for exchange approve). */
export function isImportReadyDeposit(row: DepositRow): boolean {
  return (
    row.status === "pending" &&
    Boolean(row.playerMongoId?.trim()) &&
    row.bonusAmount != null &&
    Number.isFinite(row.bonusAmount)
  );
}
