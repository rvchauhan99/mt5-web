import { createBank as createBankAccount, listBanksRaw } from "./bankService";
import { createDeposit as createDepositApi } from "./depositService";
import type { BankCreateInput } from "@/types/bank";
import type { DepositCreateInput } from "@/types/deposit";

export type BankPayload = BankCreateInput;

export type DepositPayload = DepositCreateInput;

export const financialService = {
  createBank: async (payload: BankPayload) => {
    const data = await createBankAccount(payload);
    return { success: true, data };
  },
  listBanks: listBanksRaw,
  createDeposit: async (payload: DepositPayload) => {
    const data = await createDepositApi(payload);
    return { success: true, data };
  },
};
