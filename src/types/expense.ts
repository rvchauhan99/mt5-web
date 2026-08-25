export type ExpenseStatus = "pending_audit" | "approved" | "rejected" | "cancelled";

export type ExpenseTypeOption = {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  requiresAudit?: boolean;
};

export type ExpenseDocumentMeta = {
  path: string;
  filename: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
};

export type ExpenseRow = {
  _id: string;
  id: string;
  expenseTypeId?: string;
  expenseTypeName?: string;
  amount: number;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  expenseDate?: string;
  description?: string;
  bankId?: string;
  bankName: string;
  settlementAccountType?: "bank" | "person";
  liabilityPersonId?: string;
  liabilityPersonName?: string;
  liabilityEntryId?: string;
  status: ExpenseStatus;
  rejectReason?: string;
  cancelReason?: string;
  bankBalanceAfter?: number;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdByName?: string;
  approvedByName?: string;
  cancelledByName?: string;
  createdBy?: string;
  approvedBy?: string;
  cancelledBy?: string;
  documents?: ExpenseDocumentMeta[];
};

export type ExpenseApproveInput =
  | { settlementAccountType: "bank"; bankId: string }
  | { settlementAccountType: "person"; liabilityPersonId: string };

export type ExpenseCreateInput = {
  expenseTypeId: string;
  amount: number;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  expenseDate: string;
  description?: string;
  bankId?: string;
  liabilityPersonId?: string;
};

export type ExpenseUpdateInput = {
  expenseTypeId?: string;
  amount?: number;
  operatedCurrency?: string;
  operatedAmount?: number;
  exchangeRate?: number;
  expenseDate?: string;
  description?: string;
  bankId?: string | null;
};
