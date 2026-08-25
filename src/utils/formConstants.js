/**
 * ERP-Level Form Constants
 * Standardized spacing and sizing for all forms across the application
 */

// Spacing Standards
export const FORM_SPACING = 1.5; // Compact spacing for Grid containers (default was 2)
export const FORM_PADDING = 1.5; // Compact padding for Paper/Box containers (default was 2-3)
export const FORM_GAP = 1.5; // Compact gap for flex/grid layouts (default was 2)
export const SECTION_SPACING = 2; // Spacing between form sections

// ERP-style compact spacing (opt-in for forms that need more fields in less space)
export const COMPACT_FORM_SPACING = 1; // Grid spacing between field rows/columns
export const COMPACT_SECTION_GAP_TOP = 1; // Margin above section headers
export const COMPACT_SECTION_GAP_BOTTOM = 1; // Margin below section headers
export const COMPACT_SECTION_HEADER_PADDING = "6px 12px"; // Section header block padding

/** Shared section header style for compact ERP forms (use as sx={COMPACT_SECTION_HEADER_STYLE}) */
export const COMPACT_SECTION_HEADER_STYLE = {
  backgroundColor: "#f5f5f5",
  padding: COMPACT_SECTION_HEADER_PADDING,
  borderRadius: "4px 4px 0 0",
  marginTop: COMPACT_SECTION_GAP_TOP,
  marginBottom: COMPACT_SECTION_GAP_BOTTOM,
};

/**
 * Tailwind class for compact ERP section headers. Use className={COMPACT_SECTION_HEADER_CLASS}.
 * Matches COMPACT_SECTION_HEADER_STYLE: bg #f5f5f5, padding 6px 12px, rounded top, mt/mb 4px.
 */
export const COMPACT_SECTION_HEADER_CLASS =
  "mt-1 mb-1 rounded-t bg-[#f5f5f5] px-3 py-1.5 text-sm font-semibold";

// Page and listing layout (minimum padding for all pages; listing headers and tables)
export const PAGE_PADDING = 1; // Minimum padding for page content (8px in default theme)
export const LIST_HEADER_MB = 1; // Margin below listing page header
export const TABLE_SEARCH_PADDING = 1; // Padding around table/list search bar
export const TABLE_PAGINATION_PADDING = 1; // Padding for table/list pagination bar

// Component Size Standards
export const FIELD_SIZE = "small"; // All fields default to small
export const FIELD_SIZE_MEDIUM = "medium"; // For important/primary actions (optional)
export const FIELD_SIZE_LARGE = "large"; // For login/special pages (if needed)

// Component Height Standards
export const FIELD_HEIGHT_SMALL = "40px"; // Standard for all form inputs
export const FIELD_HEIGHT_MEDIUM = "48px"; // For important/primary actions (optional)
export const FIELD_HEIGHT_LARGE = "56px"; // For login/special pages (if needed)

// Tailwind class for small field height (single source of truth for Input/Select/DateField/FilterBar)
export const FIELD_HEIGHT_CLASS_SMALL = "h-10";
export const FIELD_TEXT_SMALL = "text-sm";

// Border Radius Standards
export const FIELD_BORDER_RADIUS = "6px"; // Consistent across all field types

// Font Size Standards
export const FIELD_FONT_SIZE = "0.875rem"; // 14px - Input text and labels
export const HELPER_TEXT_FONT_SIZE = "0.75rem"; // 12px - Helper text

// Width Standards
export const FIELD_FULL_WIDTH = true; // Form fields use fullWidth by default
export const FIELD_MAX_WIDTH = "700px"; // Maximum width for form fields to prevent excessive stretching on large screens
export const FORM_CONTENT_MAX_WIDTH = "800px"; // Maximum width for form content container (centered)
export const FORM_CONTENT_WIDTH = "100%"; // Width of form content (100% up to max-width)

// Standard form container max height
export const FORM_MAX_HEIGHT = "calc(100vh - 180px)";

// Compact margins
export const COMPACT_MARGIN = {
  top: 1,
  bottom: 1,
  left: 0,
  right: 0,
};

// Compact padding
export const COMPACT_PADDING = {
  xs: 1,
  sm: 1.5,
  md: 1.5,
};

// Dialog / modal sizing (viewport-relative; use with DialogContent className)
// XL: forms with tables or many rows (e.g. Bill of Material Add/Edit) – maximize visibility
export const DIALOG_FORM_XL =
  "w-full max-w-[95vw] sm:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[90vw] flex flex-col max-h-[95vh] overflow-hidden";
// Large: many fields (Product, Stock Adjustment Add)
export const DIALOG_FORM_LARGE =
  "w-full max-w-[95vw] sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex flex-col max-h-[90vh] overflow-hidden";
// Medium: moderate fields (User, Supplier, Project Price)
export const DIALOG_FORM_MEDIUM =
  "w-full max-w-[95vw] sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl flex flex-col max-h-[90vh] overflow-hidden";
// Small: confirmations and short forms (Approve, Receive, Delete)
export const DIALOG_FORM_SMALL =
  "w-full max-w-[95vw] sm:max-w-md lg:max-w-lg flex flex-col max-h-[85vh] overflow-hidden";

