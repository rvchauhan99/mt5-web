import { DEFAULT_TIMEZONE, isValidIanaTimeZone } from "@/lib/userTimezone";

export { DEFAULT_TIMEZONE };

export type TimezoneOption = {
  value: string;
  label: string;
};

const TIMEZONE_LABELS: Record<string, string> = {
  "Asia/Kolkata": "Asia/Kolkata (IST)",
  "Asia/Dubai": "Asia/Dubai (GST)",
  "Asia/Singapore": "Asia/Singapore (SGT)",
  "Asia/Tokyo": "Asia/Tokyo (JST)",
  "Asia/Shanghai": "Asia/Shanghai (CST)",
  "Asia/Karachi": "Asia/Karachi (PKT)",
  "Asia/Dhaka": "Asia/Dhaka (BST)",
  "Asia/Colombo": "Asia/Colombo (SLST)",
  "Europe/London": "Europe/London (GMT/BST)",
  "Europe/Paris": "Europe/Paris (CET/CEST)",
  "Europe/Berlin": "Europe/Berlin (CET/CEST)",
  "America/New_York": "America/New_York (EST/EDT)",
  "America/Chicago": "America/Chicago (CST/CDT)",
  "America/Denver": "America/Denver (MST/MDT)",
  "America/Los_Angeles": "America/Los_Angeles (PST/PDT)",
  "Australia/Sydney": "Australia/Sydney (AEST/AEDT)",
  UTC: "UTC",
};

const CURATED_TIMEZONES = [
  DEFAULT_TIMEZONE,
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Colombo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
] as const;

export function formatTimezoneLabel(timeZone: string): string {
  const trimmed = timeZone.trim();
  if (TIMEZONE_LABELS[trimmed]) return TIMEZONE_LABELS[trimmed];
  return trimmed;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = CURATED_TIMEZONES.filter(isValidIanaTimeZone).map(
  (value) => ({
    value,
    label: formatTimezoneLabel(value),
  }),
);

/** Ensure a stored timezone appears in the select even if not in the curated list. */
export function timezoneOptionsWithValue(current?: string | null): TimezoneOption[] {
  const trimmed = current?.trim();
  if (!trimmed || !isValidIanaTimeZone(trimmed)) return TIMEZONE_OPTIONS;
  if (TIMEZONE_OPTIONS.some((opt) => opt.value === trimmed)) return TIMEZONE_OPTIONS;
  return [{ value: trimmed, label: formatTimezoneLabel(trimmed) }, ...TIMEZONE_OPTIONS];
}
