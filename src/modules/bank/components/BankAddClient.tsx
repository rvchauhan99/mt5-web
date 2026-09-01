"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconCheck, IconX } from "@tabler/icons-react";
import { FormActions, FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FieldError } from "@/components/common/FieldError";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  OperatedMoneyFields,
  defaultOperatedMoneyValue,
  toMoneyFxPayload,
} from "@/components/common/OperatedMoneyFields";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { createBank } from "@/services/bankService";
import {
  listPaymentMethodLookupOptions,
  type LookupPaymentMethodOption,
} from "@/services/lookupService";
import type { BankCreateInput } from "@/types/bank";
import { getApiErrorMessage } from "@/lib/apiError";

const initialState: BankCreateInput = {
  method: "",
  openingBalance: 0,
  status: "active",
};

export function BankAddClient() {
  const { platformCurrency } = usePlatformSettings();
  const [form, setForm] = useState<BankCreateInput>(initialState);
  const [openingMoney, setOpeningMoney] = useState(() => defaultOperatedMoneyValue(platformCurrency));
  const [loading, setLoading] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<LookupPaymentMethodOption[]>([]);
  const [errors, setErrors] = useState<{
    method?: string;
    openingBalance?: string;
  }>({});

  useEffect(() => {
    if (!platformCurrency) return;
    setOpeningMoney((prev) =>
      prev.operatedCurrency ? prev : { ...prev, operatedCurrency: platformCurrency },
    );
  }, [platformCurrency]);

  useEffect(() => {
    let active = true;
    setMethodsLoading(true);
    listPaymentMethodLookupOptions({ limit: 100 })
      .then((rows) => {
        if (!active) return;
        setPaymentMethods(rows);
        setForm((prev) => {
          if (prev.method) return prev;
          const first = rows[0]?.code || "";
          return first ? { ...prev, method: first } : prev;
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(getApiErrorMessage(error, "Failed to load payment methods"));
      })
      .finally(() => {
        if (active) setMethodsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const reset = () => {
    setForm({
      ...initialState,
      method: paymentMethods[0]?.code || "",
    });
    setOpeningMoney(defaultOperatedMoneyValue(platformCurrency));
    setErrors({});
  };

  const onSubmit = async () => {
    if (!platformCurrency) {
      toast.error("Set platform currency in Profile first");
      return;
    }
    const nextErrors: typeof errors = {};
    if (!form.method.trim()) nextErrors.method = "Payment method is required.";
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
        method: form.method.trim(),
        status: form.status,
        openingBalance: fx.amount,
        openingOperatedCurrency: fx.operatedCurrency,
        openingOperatedAmount: fx.operatedAmount,
        openingExchangeRate: fx.exchangeRate,
      });
      toast.success("Payment account created successfully.");
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
        title="Add Payment Account"
        description="Create a payment account with opening balance. Manage methods in Masters → Payment Method."
      >
        <FormGrid>
          <div>
            <FieldLabel>Payment method *</FieldLabel>
            <Select
              value={form.method}
              onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
              disabled={methodsLoading || paymentMethods.length === 0}
            >
              {paymentMethods.length === 0 ? (
                <option value="">
                  {methodsLoading ? "Loading…" : "No payment methods — add in Masters"}
                </option>
              ) : (
                paymentMethods.map((method) => (
                  <option key={method.id} value={method.code}>
                    {method.label}
                  </option>
                ))
              )}
            </Select>
            <FieldError message={errors.method} />
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
            disabled={loading || methodsLoading || paymentMethods.length === 0}
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
