/**
 * Data table utilities – reference-style formatting and styles for listing tables.
 * Aligns with karebo reference: formatDate, formatCurrency (INR), TABLE_REFERENCE_STYLES.
 */

import { formatDateTimeForUser } from "@/lib/userTimezone";

/**
 * Format date/datetime for display in the user's profile timezone (en-GB).
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return "-";
  const formatted = formatDateTimeForUser(dateString);
  return formatted === "—" ? String(dateString) : formatted;
}

/**
 * Format currency for display (INR).
 * @param {number} value
 * @returns {string} e.g. "₹1,234.56"
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Reference-style table styling (header #F1F1F1, compact rows, max rows per page).
 * Use in PaginatedTable sx or theme overrides.
 */
export const TABLE_REFERENCE_STYLES = {
  headerBackgroundColor: "#F1F1F1",
  headerFontSize: 14,
  headerFontWeight: 700,
  cellPaddingCompact: "6px 10px",
  borderRadius: 8,
  rowMinHeight: 36,
};
