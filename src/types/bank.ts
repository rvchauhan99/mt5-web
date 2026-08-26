export type BankStatus = "active" | "deactive";
export type BankMethod = "crypto" | "bank_transfer" | "sgpay" | "trustpay" | "card_entry";

export type BankCreateInput = {
  method: BankMethod;
  name?: string;
  openingBalance: number;
  openingOperatedCurrency?: string;
  openingOperatedAmount?: number;
  openingExchangeRate?: number;
  status: BankStatus;
};

export type BankRow = {
  _id: string;
  id: string;
  method?: BankMethod;
  holderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  displayName?: string;
  openingBalance: number;
  openingOperatedCurrency?: string;
  openingOperatedAmount?: number;
  openingExchangeRate?: number;
  currentBalance?: number;
  closingBalanceActual?: number;
  status: BankStatus;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: unknown;
  createdByName?: string;
};
