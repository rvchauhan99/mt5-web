/** Apply-time mapping for expense final list filters (no operator UI). */

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

/** Reverse URL filters → two display fields for range inputs */
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

export type DateRangeApi = {
  from: string;
  to: string;
  op: string;
};

/** From/To dates → API params with range op */
export function buildDateRangeApiParams(
  fromStr: string,
  toStr: string,
  prefix: "createdAt" | "expenseDate",
): Record<string, string> {
  const f = fromStr.trim();
  const t = toStr.trim();
  if (!f && !t) {
    return { [`${prefix}_from`]: "", [`${prefix}_to`]: "", [`${prefix}_op`]: "" };
  }
  if (f && t) {
    const from = f <= t ? f : t;
    const to = f <= t ? t : f;
    return { [`${prefix}_from`]: from, [`${prefix}_to`]: to, [`${prefix}_op`]: "inRange" };
  }
  if (f && !t) {
    return { [`${prefix}_from`]: f, [`${prefix}_to`]: "", [`${prefix}_op`]: "" };
  }
  return { [`${prefix}_from`]: "", [`${prefix}_to`]: t, [`${prefix}_op`]: "" };
}

export type AuditDateApi = {
  createdAt_from: string;
  createdAt_to: string;
  createdAt_op: string;
};

export type ExpenseDateApi = {
  expenseDate_from: string;
  expenseDate_to: string;
  expenseDate_op: string;
};

export function buildCreatedAtApiParams(from: string, to: string): AuditDateApi {
  const x = buildDateRangeApiParams(from, to, "createdAt");
  return {
    createdAt_from: x.createdAt_from,
    createdAt_to: x.createdAt_to,
    createdAt_op: x.createdAt_op,
  };
}

export function buildExpenseDateApiParams(from: string, to: string): ExpenseDateApi {
  const x = buildDateRangeApiParams(from, to, "expenseDate");
  return {
    expenseDate_from: x.expenseDate_from,
    expenseDate_to: x.expenseDate_to,
    expenseDate_op: x.expenseDate_op,
  };
}

export function fixedTextOperatorsForApply(): Record<string, string> {
  return {
    // any text 'contains' logic goes here
  };
}
