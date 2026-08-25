export function formatExpenseSettlementColumn(row: {
  settlementAccountType?: "bank" | "person";
  bankName?: string;
  liabilityPersonName?: string;
}): string {
  if (row.settlementAccountType === "person") {
    const name = row.liabilityPersonName?.trim();
    return name ? `LP: ${name}` : "—";
  }
  return row.bankName?.trim() || "—";
}
