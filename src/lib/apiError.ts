type ApiErrorPayload = {
  message?: string;
  response?: {
    data?: {
      message?: string;
      error?: {
        message?: string;
        details?: {
          duplicateTransaction?: {
            type?: string;
            id?: string;
            status?: string;
            dateTime?: string;
          };
          errors?: { row: number; message: string }[];
          fieldErrors?: Record<string, string[] | undefined>;
          formErrors?: string[];
        } & Record<string, unknown>;
      };
    };
  };
};

function messageFromValidationDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as { fieldErrors?: Record<string, string[] | undefined>; formErrors?: string[] };
  const fieldErrors = d.fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    const parts: string[] = [];
    for (const [field, msgs] of Object.entries(fieldErrors)) {
      if (Array.isArray(msgs) && msgs.length > 0) {
        const label = field === "_root" ? "Request" : field;
        parts.push(`${label}: ${msgs.join(", ")}`);
      }
    }
    if (parts.length > 0) return parts.join("; ");
  }
  const formErrors = d.formErrors;
  if (Array.isArray(formErrors) && formErrors.length > 0) {
    return formErrors.filter(Boolean).join("; ");
  }
  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const obj = error as ApiErrorPayload;
    const err = obj.response?.data?.error;
    let msg = err?.message ?? obj.response?.data?.message ?? obj.message ?? fallback;
    if (msg === "Validation failed" && err?.details) {
      const fromDetails = messageFromValidationDetails(err.details);
      if (fromDetails) msg = fromDetails;
    }
    if (msg === "UTR already exists in another transaction" && err?.details) {
      const dup = err.details.duplicateTransaction;
      const txType = String(dup?.type ?? "").trim();
      const txId = String(dup?.id ?? "").trim();
      const txStatus = String(dup?.status ?? "").trim();
      const txDate = String(dup?.dateTime ?? "").trim();
      const pieces = [
        txType ? `type: ${txType}` : "",
        txId ? `id: ${txId}` : "",
        txStatus ? `status: ${txStatus}` : "",
        txDate ? `date: ${txDate}` : "",
      ].filter(Boolean);
      if (pieces.length > 0) {
        msg = `${msg} (${pieces.join(", ")})`;
      }
    }
    return msg;
  }
  return fallback;
}

/** Row-level import validation errors from API (HTTP 400, error.details.errors). */
export function getApiImportRowErrors(error: unknown): { row: number; message: string }[] {
  if (typeof error !== "object" || error === null) return [];
  const details = (error as ApiErrorPayload).response?.data?.error?.details;
  if (!details || typeof details !== "object") return [];
  const rows = "errors" in details ? (details as { errors?: unknown }).errors : undefined;
  return Array.isArray(rows) ? (rows as { row: number; message: string }[]) : [];
}

export function formatImportErrorToast(error: unknown, fallback: string): { title: string; description?: string } {
  const message = getApiErrorMessage(error, fallback);
  const rowErrors = getApiImportRowErrors(error);
  if (rowErrors.length === 0) {
    return { title: message };
  }
  const lines = rowErrors.slice(0, 8).map((e) => `Row ${e.row}: ${e.message}`);
  const more =
    rowErrors.length > 8 ? `\n… and ${rowErrors.length - 8} more issue(s). Fix the file and try again.` : "";
  return {
    title: message,
    description: `${lines.join("\n")}${more}`,
  };
}
