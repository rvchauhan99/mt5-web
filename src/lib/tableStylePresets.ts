import type { BadgeVariant } from "@/components/ui/Badge";

type ColumnWidthPreset = {
  minWidth: number;
  width?: number;
  maxWidth?: number;
};

export const tableColumnPresets: Record<string, ColumnWidthPreset> = {
  nameCol: { minWidth: 180, maxWidth: 260 },
  statusCol: { minWidth: 120, width: 130, maxWidth: 140 },
  actionsCol: { minWidth: 170, width: 180, maxWidth: 220 },
  dateCol: { minWidth: 180, width: 210, maxWidth: 240 },
};

type StatusBadgeConfig = {
  label: string;
  variant: BadgeVariant;
};

const STATUS_BADGE_MAP: Record<string, StatusBadgeConfig> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "warning" },
  deactive: { label: "Inactive", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  not_settled: { label: "Not Settled", variant: "outline" },
  approved: { label: "Approved", variant: "success" },
  verified: { label: "Verified", variant: "info" },
  finalized: { label: "Finalized", variant: "primary" },
  rejected: { label: "Rejected", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "outline" },
  requested: { label: "Requested", variant: "info" },
};

const toLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function getStatusBadgeConfig(statusValue?: string): StatusBadgeConfig {
  const normalized = (statusValue || "").toLowerCase().trim();
  if (!normalized) return { label: "-", variant: "default" };
  return STATUS_BADGE_MAP[normalized] ?? { label: toLabel(normalized), variant: "default" };
}
