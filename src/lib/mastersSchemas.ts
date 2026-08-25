import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

/** Mirrors crickierp-api `masters.validation.ts` for client-side checks. */

export const createReasonBodySchema = z
  .object({
    reasonType: z.string().min(1).max(200).trim().default("general"),
    reason: z.string().min(1).max(2000).trim(),
    description: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.string().max(10000).trim().optional(),
    ),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateReasonBodySchema = createReasonBodySchema.partial().strict();

export const createExpenseTypeBodySchema = z
  .object({
    name: z.string().min(1).max(500).trim(),
    code: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.string().max(100).trim().optional(),
    ),
    description: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.string().max(10000).trim().optional(),
    ),
    isActive: z.boolean().optional(),
    auditRequired: z.boolean().optional().default(false),
  })
  .strict();

export const updateExpenseTypeBodySchema = createExpenseTypeBodySchema.partial().strict();

const currencyEnum = z.enum(SUPPORTED_CURRENCIES);

export const createExchangeRateBodySchema = z
  .object({
    fromCurrency: currencyEnum,
    toCurrency: currencyEnum,
    rate: z.number().positive(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.fromCurrency === data.toCurrency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From and to currency must be different",
        path: ["toCurrency"],
      });
    }
  });

export const updateExchangeRateBodySchema = z
  .object({
    fromCurrency: currencyEnum.optional(),
    toCurrency: currencyEnum.optional(),
    rate: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.fromCurrency !== undefined &&
      data.toCurrency !== undefined &&
      data.fromCurrency === data.toCurrency
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From and to currency must be different",
        path: ["toCurrency"],
      });
    }
  });

export type MasterModelKey = "reason" | "expenseType" | "exchangeRate";

export function validateMasterPayload(
  modelKey: MasterModelKey,
  mode: "create" | "edit",
  payload: Record<string, unknown>,
): { success: true; data: Record<string, unknown> } | { success: false; fieldErrors: Record<string, string> } {
  const schema =
    modelKey === "reason"
      ? mode === "create"
        ? createReasonBodySchema
        : updateReasonBodySchema
      : modelKey === "expenseType"
        ? mode === "create"
          ? createExpenseTypeBodySchema
          : updateExpenseTypeBodySchema
        : mode === "create"
          ? createExchangeRateBodySchema
          : updateExchangeRateBodySchema;

  const result = schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }
  const fieldErrors: Record<string, string> = {};
  const flat = result.error.flatten();
  if (flat.fieldErrors) {
    for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
      if (msgs?.[0]) fieldErrors[key] = msgs[0];
    }
  }
  if (flat.formErrors?.length) {
    fieldErrors._form = flat.formErrors[0] ?? "Validation failed";
  }
  return { success: false, fieldErrors };
}
