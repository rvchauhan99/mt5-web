export const BANK_METHODS = ["crypto", "bank_transfer", "sgpay", "trustpay", "card_entry"] as const;
export type BankMethod = (typeof BANK_METHODS)[number];

export const BANK_METHOD_LABELS: Record<BankMethod, string> = {
  crypto: "Crypto",
  bank_transfer: "Bank Transfer",
  sgpay: "SGPay",
  trustpay: "TrustPay",
  card_entry: "Card Entry",
};

export function isBankMethod(value: unknown): value is BankMethod {
  return typeof value === "string" && (BANK_METHODS as readonly string[]).includes(value);
}

export function bankMethodLabel(method: unknown): string {
  return isBankMethod(method) ? BANK_METHOD_LABELS[method] : "";
}

export function bankDisplayLabel(row: {
  method?: string | null;
  holderName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  name?: string | null;
}): string {
  const methodLabel = bankMethodLabel(row.method);
  const name = String(row.name ?? row.holderName ?? "").trim();
  if (methodLabel) {
    if (name && name.toLowerCase() !== methodLabel.toLowerCase()) {
      return `${name} (${methodLabel})`;
    }
    return name || methodLabel;
  }
  const bankName = String(row.bankName ?? "").trim();
  const account = String(row.accountNumber ?? "").trim();
  const last4 = account.length >= 4 ? account.slice(-4) : account;
  const parts = [name, bankName].filter(Boolean);
  if (last4) parts.push(last4);
  return parts.join(" - ") || "Unknown";
}
