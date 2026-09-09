"use client";

import { useEffect, useRef, useState } from "react";
import { CurrencySelect } from "@/components/common/CurrencySelect";
import { FieldLabel } from "@/components/common/FieldLabel";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  computeExchangeRateFromAmounts,
  computePlatformAmount,
  getCurrencyFractionDigits,
  roundExchangeRate,
  roundMoneyToCurrency,
} from "@/lib/currencies";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { lookupExchangeRate } from "@/services/lookupService";

export type OperatedMoneyValue = {
  amount: string;
  operatedCurrency: string;
  exchangeRate: string;
};

type OperatedMoneyFieldsProps = {
  value: OperatedMoneyValue;
  onChange: (next: OperatedMoneyValue) => void;
  amountLabel?: string;
  disabled?: boolean;
  /** @deprecated ignored — rounding is always ISO minor-unit half-up */
  roundMode?: "integer" | "decimal";
  /** @deprecated ignored — input mode follows operated currency fraction digits */
  amountInputMode?: "numeric" | "decimal";
  minAmount?: number;
  idPrefix?: string;
  /** Match compact ERP rows (h-9 controls + smaller labels), e.g. Deposit Banker */
  compact?: boolean;
};

type RateSourceHint = "direct" | "reverse" | null;
type LastEditedField = "operated" | "rate" | "platform";

export function OperatedMoneyFields({
  value,
  onChange,
  amountLabel = "Amount",
  disabled = false,
  minAmount,
  idPrefix = "money",
  compact = false,
}: OperatedMoneyFieldsProps) {
  const { platformCurrency, settings, isLoading } = usePlatformSettings();
  const currencies = settings?.supportedCurrencies?.length
    ? settings.supportedCurrencies
    : platformCurrency
      ? [platformCurrency]
      : [];

  const effectivePlatform = platformCurrency ?? "";
  const operatedCurrency = value.operatedCurrency || effectivePlatform;
  const sameCurrency = !effectivePlatform || operatedCurrency === effectivePlatform;
  const operatedDigits = getCurrencyFractionDigits(operatedCurrency);
  const platformDigits = getCurrencyFractionDigits(effectivePlatform);
  const amountStep = operatedDigits === 0 ? 1 : Number((10 ** -operatedDigits).toFixed(operatedDigits));
  const platformStep = platformDigits === 0 ? 1 : Number((10 ** -platformDigits).toFixed(platformDigits));
  const effectiveMin = minAmount ?? 0;

  const [rateHint, setRateHint] = useState<RateSourceHint>(null);
  const [rateLoading, setRateLoading] = useState(false);
  /** Draft for final (platform) amount while typing; synced from computed when not last-edited. */
  const [platformDraft, setPlatformDraft] = useState("");
  /** Last rate we auto-filled for a pair — don't overwrite user edits */
  const autoFilledRef = useRef<{ pair: string; rate: string } | null>(null);
  const lastEditedRef = useRef<LastEditedField>("operated");
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!effectivePlatform || !operatedCurrency) return;

    const pair = `${operatedCurrency}>${effectivePlatform}`;

    if (operatedCurrency === effectivePlatform) {
      autoFilledRef.current = { pair, rate: "1" };
      setRateHint(null);
      if (valueRef.current.exchangeRate !== "1") {
        onChangeRef.current({ ...valueRef.current, exchangeRate: "1" });
      }
      return;
    }

    let cancelled = false;

    const run = async () => {
      setRateLoading(true);
      try {
        const result = await lookupExchangeRate(operatedCurrency, effectivePlatform);
        if (cancelled) return;

        const nextRate =
          result.rate != null && Number.isFinite(result.rate) && result.rate > 0
            ? String(result.rate)
            : "";

        const current = valueRef.current;
        const currentRate = current.exchangeRate;
        const prevAuto = autoFilledRef.current;
        const isStillAutoValue =
          lastEditedRef.current !== "platform" &&
          (currentRate.trim() === "" ||
            currentRate === "1" ||
            (prevAuto != null && prevAuto.rate === currentRate));

        autoFilledRef.current = { pair, rate: nextRate };
        setRateHint(nextRate ? result.source : null);

        if (isStillAutoValue && currentRate !== nextRate) {
          onChangeRef.current({ ...current, exchangeRate: nextRate });
        }
      } catch {
        if (cancelled) return;
        autoFilledRef.current = { pair, rate: "" };
        setRateHint(null);
        const current = valueRef.current;
        if (
          lastEditedRef.current !== "platform" &&
          (current.exchangeRate === "1" || current.exchangeRate.trim() === "")
        ) {
          onChangeRef.current({ ...current, exchangeRate: "" });
        }
      } finally {
        if (!cancelled) setRateLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [operatedCurrency, effectivePlatform]);

  const operatedNum = Number(value.amount);
  const rateNum = sameCurrency ? 1 : Number(value.exchangeRate);
  const hasComputedPlatform =
    Number.isFinite(operatedNum) &&
    operatedNum >= effectiveMin &&
    Number.isFinite(rateNum) &&
    rateNum > 0 &&
    Boolean(effectivePlatform);

  const computedPlatform = hasComputedPlatform
    ? computePlatformAmount(operatedNum, rateNum, effectivePlatform, operatedCurrency)
    : null;

  // Keep platform draft in sync when operated/rate drive the value (or same-currency link).
  useEffect(() => {
    if (lastEditedRef.current === "platform" && !sameCurrency) return;
    if (computedPlatform == null) {
      if (sameCurrency && value.amount.trim() === "") setPlatformDraft("");
      else if (!sameCurrency) setPlatformDraft("");
      return;
    }
    setPlatformDraft(String(computedPlatform));
  }, [computedPlatform, sameCurrency, value.amount]);

  const canDeriveRateFromPlatform =
    !sameCurrency &&
    Number.isFinite(operatedNum) &&
    operatedNum > 0 &&
    Boolean(effectivePlatform);

  const handleCurrencyChange = (nextCurrency: string) => {
    lastEditedRef.current = "operated";
    onChange({
      ...value,
      operatedCurrency: nextCurrency,
      exchangeRate: nextCurrency === effectivePlatform ? "1" : "",
    });
    setRateHint(null);
  };

  const handleOperatedAmountChange = (nextAmount: string) => {
    lastEditedRef.current = "operated";
    if (sameCurrency) {
      setPlatformDraft(nextAmount);
      onChange({ ...value, amount: nextAmount, exchangeRate: "1" });
      return;
    }
    onChange({ ...value, amount: nextAmount });
  };

  const handleRateChange = (nextRate: string) => {
    lastEditedRef.current = "rate";
    const pair = `${operatedCurrency}>${effectivePlatform}`;
    const prevAuto = autoFilledRef.current;
    if (!prevAuto || prevAuto.pair !== pair || prevAuto.rate !== nextRate) {
      setRateHint(null);
      // User-owned rate — clear auto marker so lookup won't treat this as auto-fill target
      if (prevAuto?.pair === pair) {
        autoFilledRef.current = { pair, rate: "__user__" };
      }
    }
    onChange({ ...value, exchangeRate: nextRate });
  };

  const handlePlatformAmountChange = (raw: string) => {
    lastEditedRef.current = "platform";
    setPlatformDraft(raw);

    if (sameCurrency) {
      onChange({ ...value, amount: raw, exchangeRate: "1" });
      return;
    }

    if (!canDeriveRateFromPlatform) return;

    const platformNum = Number(raw);
    if (!Number.isFinite(platformNum) || platformNum < 0 || raw.trim() === "") return;

    const nextRate = computeExchangeRateFromAmounts(
      platformNum,
      operatedNum,
      effectivePlatform,
      operatedCurrency,
    );
    if (!Number.isFinite(nextRate) || nextRate <= 0) return;

    setRateHint(null);
    autoFilledRef.current = {
      pair: `${operatedCurrency}>${effectivePlatform}`,
      rate: "__user__",
    };
    onChange({ ...value, exchangeRate: String(nextRate) });
  };

  const handlePlatformBlur = () => {
    if (sameCurrency) {
      if (value.amount.trim() !== "") {
        const snapped = roundMoneyToCurrency(Number(value.amount), effectivePlatform);
        if (Number.isFinite(snapped)) {
          const asStr = String(snapped);
          setPlatformDraft(asStr);
          if (asStr !== value.amount) {
            onChange({ ...value, amount: asStr, exchangeRate: "1" });
          }
        }
      }
      return;
    }

    if (!canDeriveRateFromPlatform) {
      if (computedPlatform != null) setPlatformDraft(String(computedPlatform));
      return;
    }

    const platformNum = Number(platformDraft);
    if (!Number.isFinite(platformNum) || platformNum < 0 || platformDraft.trim() === "") {
      if (computedPlatform != null) setPlatformDraft(String(computedPlatform));
      return;
    }

    const nextRate = computeExchangeRateFromAmounts(
      platformNum,
      operatedNum,
      effectivePlatform,
      operatedCurrency,
    );
    if (!Number.isFinite(nextRate) || nextRate <= 0) {
      if (computedPlatform != null) setPlatformDraft(String(computedPlatform));
      return;
    }

    const snapped = computePlatformAmount(
      operatedNum,
      nextRate,
      effectivePlatform,
      operatedCurrency,
    );
    setPlatformDraft(String(snapped));
    if (String(nextRate) !== value.exchangeRate) {
      onChange({ ...value, exchangeRate: String(nextRate) });
    }
  };

  const labelClass = compact ? "mb-1 text-xs text-muted-foreground" : undefined;
  const controlHeight = compact ? "h-9" : "h-10";

  const rateSourceLabel = (() => {
    if (sameCurrency) return null;
    if (rateLoading) return "Loading rate…";
    if (rateHint === "direct") return "From master";
    if (rateHint === "reverse") return "From master (reverse)";
    if (!value.exchangeRate.trim()) return "No master rate — enter manually";
    if (lastEditedRef.current === "platform") return "Rate from final amount";
    return null;
  })();

  if (!effectivePlatform && !isLoading) {
    return (
      <div className="col-span-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Platform currency is not configured. Set it once under Profile before creating money transactions.
      </div>
    );
  }

  const finalAmountLabel = effectivePlatform
    ? `Final amount (${effectivePlatform})`
    : "Final amount";

  return (
    <div
      className={cn(
        "grid w-full gap-2",
        sameCurrency
          ? "col-span-1 grid-cols-1 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3"
          : "col-span-1 grid-cols-1 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4",
      )}
    >
      <div>
        <FieldLabel className={labelClass}>Operated currency</FieldLabel>
        <CurrencySelect
          id={`${idPrefix}-currency`}
          value={operatedCurrency}
          onChange={handleCurrencyChange}
          currencies={currencies}
          platformCurrency={effectivePlatform || null}
          disabled={disabled || isLoading || !effectivePlatform}
          aria-label="Operated currency"
          placeholder="Search currency..."
        />
      </div>

      <div>
        <FieldLabel className={labelClass}>{amountLabel}</FieldLabel>
        <Input
          id={`${idPrefix}-amount`}
          type="number"
          inputMode="decimal"
          min={effectiveMin}
          step={amountStep}
          value={value.amount}
          disabled={disabled || !effectivePlatform}
          aria-label={amountLabel}
          className={cn(controlHeight, compact && "text-sm")}
          onChange={(e) => handleOperatedAmountChange(e.target.value)}
        />
      </div>

      {!sameCurrency && (
        <div>
          <FieldLabel className={labelClass}>Exchange rate *</FieldLabel>
          <Input
            id={`${idPrefix}-rate`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={value.exchangeRate}
            disabled={disabled || rateLoading}
            aria-label="Exchange rate"
            placeholder={rateLoading ? "Loading…" : "e.g. 83.5"}
            className={cn(controlHeight, compact && "text-sm")}
            onChange={(e) => handleRateChange(e.target.value)}
          />
        </div>
      )}

      <div>
        <FieldLabel className={labelClass}>{finalAmountLabel}</FieldLabel>
        <Input
          id={`${idPrefix}-final`}
          type="number"
          inputMode="decimal"
          min={0}
          step={platformStep}
          value={platformDraft}
          disabled={
            disabled ||
            !effectivePlatform ||
            (!sameCurrency && !canDeriveRateFromPlatform && !hasComputedPlatform)
          }
          aria-label={finalAmountLabel}
          placeholder={!sameCurrency && !canDeriveRateFromPlatform ? "Enter operated amount first" : undefined}
          className={cn(controlHeight, compact && "text-sm")}
          onChange={(e) => handlePlatformAmountChange(e.target.value)}
          onBlur={handlePlatformBlur}
        />
      </div>

      {Boolean(effectivePlatform) && (
        <div
          className={cn(
            "col-span-full flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground",
            compact ? "text-xs" : "text-xs sm:text-sm",
          )}
          aria-live="polite"
        >
          {!sameCurrency ? (
            <span>Change rate or final amount — the other updates</span>
          ) : (
            <span>Same currency — operated and final stay linked</span>
          )}
          {!sameCurrency && rateSourceLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{rateSourceLabel}</span>
            </>
          ) : null}
          {!sameCurrency && hasComputedPlatform ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                1 {operatedCurrency} → {effectivePlatform}
                {Number.isFinite(rateNum) && rateNum > 0
                  ? ` @ ${roundExchangeRate(rateNum)}`
                  : ""}
              </span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function toMoneyFxPayload(
  value: OperatedMoneyValue,
  platformCurrency: string,
  _roundMode?: "integer" | "decimal",
): { amount: number; operatedCurrency: string; operatedAmount: number; exchangeRate: number } {
  const operatedCurrency = value.operatedCurrency || platformCurrency;
  const operatedAmount = roundMoneyToCurrency(Number(value.amount), operatedCurrency);
  const same = operatedCurrency === platformCurrency;
  const exchangeRate = same ? 1 : roundExchangeRate(Number(value.exchangeRate));
  const amount = computePlatformAmount(operatedAmount, exchangeRate, platformCurrency, operatedCurrency);
  return { amount, operatedCurrency, operatedAmount, exchangeRate };
}

export function defaultOperatedMoneyValue(platformCurrency: string | null): OperatedMoneyValue {
  return {
    amount: "",
    operatedCurrency: platformCurrency ?? "",
    exchangeRate: "1",
  };
}
