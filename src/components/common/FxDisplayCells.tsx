"use client"

import { formatMoney } from "@/lib/formatMoney"

type FxFields = {
  operatedCurrency?: string | null
  operatedAmount?: number | null
  exchangeRate?: number | null
}

/** Format stored operated amount in its currency; falls back to em dash. */
export const formatOperatedAmountDisplay = (
  operatedAmount?: number | null,
  operatedCurrency?: string | null,
): string => {
  if (operatedAmount == null || !Number.isFinite(operatedAmount)) return "—"
  if (operatedCurrency) {
    return formatMoney(operatedAmount, operatedCurrency)
  }
  return formatMoney(operatedAmount, null, { withSymbol: false })
}

/** Table cell: operated amount formatted in operated currency. */
export const FxOperatedAmountCell = ({ operatedAmount, operatedCurrency }: FxFields) => (
  <span className="tabular-nums">
    {formatOperatedAmountDisplay(operatedAmount, operatedCurrency)}
  </span>
)

/** Table cell: currency code + muted exchange rate on second line. */
export const FxCurrencyRateCell = ({ operatedCurrency, exchangeRate }: FxFields) => {
  if (!operatedCurrency && (exchangeRate == null || !Number.isFinite(exchangeRate))) {
    return <span>—</span>
  }

  return (
    <div className="leading-tight">
      <div className="font-medium text-slate-800">{operatedCurrency || "—"}</div>
      {exchangeRate != null && Number.isFinite(exchangeRate) ? (
        <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">Rate: {String(exchangeRate)}</div>
      ) : (
        <div className="text-[10px] text-slate-400 mt-0.5">Rate: —</div>
      )}
    </div>
  )
}
