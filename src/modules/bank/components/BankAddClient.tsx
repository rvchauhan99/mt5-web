"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconCheck, IconX } from "@tabler/icons-react";
import { FormActions, FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FieldError } from "@/components/common/FieldError";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  OperatedMoneyFields,
  defaultOperatedMoneyValue,
  toMoneyFxPayload,
} from "@/components/common/OperatedMoneyFields";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { createBank } from "@/services/bankService";
import type { BankCreateInput } from "@/types/bank";
import { getApiErrorMessage } from "@/lib/apiError";

const initialState: BankCreateInput = {
  holderName: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  openingBalance: 0,
  status: "active",
};

export function BankAddClient() {
  const { platformCurrency } = usePlatformSettings();
  const [form, setForm] = useState<BankCreateInput>(initialState);
  const [openingMoney, setOpeningMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    holderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    openingBalance?: string;
  }>({});

  useEffect(() => {
    if (!platformCurrency) return;
    setOpeningMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency]);

  const reset = () => {
    setForm(initialState);
    setOpeningMoney(defaultOperatedMoneyValue(platformCurrency));
    setErrors({});
  };

  const onSubmit = async () => {
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    const nextErrors: typeof errors = {};
    if (!form.holderName.trim()) nextErrors.holderName = "Holder name is required.";
    if (!form.bankName.trim()) nextErrors.bankName = "Bank name is required.";
    if (!form.accountNumber.trim()) nextErrors.accountNumber = "Account number is required.";
    if (!form.ifsc.trim()) nextErrors.ifsc = "IFSC code is required.";
    const operatedAmt = openingMoney.amount.trim() === "" ? 0 : Number(openingMoney.amount);
    if (Number.isNaN(operatedAmt)) {
      nextErrors.openingBalance = "Opening balance is required.";
    } else if (operatedAmt < 0) {
      nextErrors.openingBalance = "Opening balance must be at least 0.";
    } else if ((openingMoney.operatedCurrency || platformCurrency) !== platformCurrency) {
      const rate = Number(openingMoney.exchangeRate);
      if (!openingMoney.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
        nextErrors.openingBalance = "Enter a valid exchange rate.";
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const fx = toMoneyFxPayload(
      { ...openingMoney, amount: openingMoney.amount.trim() === "" ? "0" : openingMoney.amount },
      platformCurrency,
      "decimal",
    );

    setLoading(true);
    try {
      await createBank({
        ...form,
        holderName: form.holderName.trim(),
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        ifsc: form.ifsc.trim(),
        openingBalance: fx.amount,
        openingOperatedCurrency: fx.operatedCurrency,
        openingOperatedAmount: fx.operatedAmount,
        openingExchangeRate: fx.exchangeRate,
      });
      toast.success("Bank account created successfully.");
      reset();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to create bank account"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 pb-4">
      <FormContainer
        title="Add Bank Account"
        description="Create a new bank account with opening balance."
      >
        <FormGrid>
          <div>
            <FieldLabel>Holder name *</FieldLabel>
            <Input
              placeholder="Holder name"
              value={form.holderName}
              onChange={(e) => setForm((p) => ({ ...p, holderName: e.target.value }))}
            />
            <FieldError message={errors.holderName} />
          </div>
          <div>
            <FieldLabel>Bank name *</FieldLabel>
            <Input
              placeholder="Bank name"
              value={form.bankName}
              onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
            />
            <FieldError message={errors.bankName} />
          </div>
          <div>
            <FieldLabel>Account number *</FieldLabel>
            <Input
              placeholder="Account number"
              value={form.accountNumber}
              onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
            />
            <FieldError message={errors.accountNumber} />
          </div>
          <div>
            <FieldLabel>IFSC code *</FieldLabel>
            <Input
              placeholder="IFSC code"
              value={form.ifsc}
              onChange={(e) => setForm((p) => ({ ...p, ifsc: e.target.value }))}
            />
            <FieldError message={errors.ifsc} />
          </div>
          <OperatedMoneyFields
            value={openingMoney}
            onChange={setOpeningMoney}
            amountLabel="Opening balance *"
            roundMode="decimal"
            minAmount={0}
            idPrefix="bank-opening"
          />
          {errors.openingBalance ? (
            <div className="col-span-full">
              <FieldError message={errors.openingBalance} />
            </div>
          ) : null}
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as BankCreateInput["status"] }))}
            >
              <option value="active">Active</option>
              <option value="deactive">Deactive</option>
            </Select>
          </div>
        </FormGrid>
        <FormActions className="justify-between px-5 py-4">
          <Button
            type="button"
            variant="success"
            startIcon={<IconCheck size={18} />}
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="danger" startIcon={<IconX size={18} />} onClick={reset} disabled={loading}>
            Cancel
          </Button>
        </FormActions>
      </FormContainer>
    </div>
  );
}
