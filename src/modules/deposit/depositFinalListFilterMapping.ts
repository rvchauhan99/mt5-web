/** Apply-time mapping for deposit final list filters (no operator UI). */

const CONTAINS = "contains";

function parseNum(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type NumericRangeApi = {
  amount: string;
  amount_to: string;
  amount_op: string;
};

export type TotalAmountApi = {
  totalAmount: string;
  totalAmount_to: string;
  totalAmount_op: string;
};

/** From/To inputs → API amount, amount_to, amount_op */
export function buildAmountApiParams(fromStr: string, toStr: string): NumericRangeApi {
  const a = parseNum(fromStr);
  const b = parseNum(toStr);
  if (a == null && b == null) return { amount: "", amount_to: "", amount_op: "" };
  if (a != null && b == null) {
    return { amount: String(a), amount_to: "", amount_op: "equals" };
  }
  if (a == null && b != null) {
    return { amount: String(b), amount_to: "", amount_op: "equals" };
  }
  if (a !== null && b !== null) {
    if (a === b) return { amount: String(a), amount_to: "", amount_op: "equals" };
    return {
      amount: String(Math.min(a, b)),
      amount_to: String(Math.max(a, b)),
      amount_op: "between",
    };
  }
  return { amount: "", amount_to: "", amount_op: "" };
}

export function buildTotalAmountApiParams(fromStr: string, toStr: string): TotalAmountApi {
  const x = buildAmountApiParams(fromStr, toStr);
  return {
    totalAmount: x.amount,
    totalAmount_to: x.amount_to,
    totalAmount_op: x.amount_op,
  };
}

/** Reverse URL filters → two display fields for amount / total amount */
export function displayNumericRangePair(
  value: string,
  valueTo: string,
  op: string,
): { from: string; to: string } {
  const x = value?.trim() ?? "";
  const y = valueTo?.trim() ?? "";
  const o = op?.trim() ?? "";
  if (!x && !y) return { from: "", to: "" };
  if (o === "between" && x && y) return { from: x, to: y };
  if (o === "equals" || (x && !y)) return { from: x, to: "" };
  if (!x && y) return { from: "", to: y };
  return { from: x, to: y };
}

export type CreatedAtApi = {
  createdAt_from: string;
  createdAt_to: string;
  createdAt_op: string;
};

/** From/To dates → API; mirrors deposit.service createdAtCondition branches */
export function buildCreatedAtApiParams(fromStr: string, toStr: string): CreatedAtApi {
  const f = fromStr.trim();
  const t = toStr.trim();
  if (!f && !t) return { createdAt_from: "", createdAt_to: "", createdAt_op: "" };
  if (f && t) return { createdAt_from: f, createdAt_to: t, createdAt_op: "inRange" };
  if (f && !t) return { createdAt_from: f, createdAt_to: "", createdAt_op: "equals" };
  return { createdAt_from: "", createdAt_to: t, createdAt_op: "" };
}

export function fixedTextOperatorsForApply(utr: string, bankName: string): {
  utr_op: string;
  bankName_op: string;
} {
  return {
    utr_op: utr.trim() ? CONTAINS : "",
    bankName_op: bankName.trim() ? CONTAINS : "",
  };
}
