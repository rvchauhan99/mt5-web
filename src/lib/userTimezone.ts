import { getSessionUser } from "@/services/sessionStore";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

const EMPTY_DISPLAY = "—";
const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const HAS_ABSOLUTE_TZ_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function normalizeTimeZone(timeZone: string | undefined | null, fallback: string = DEFAULT_TIMEZONE): string {
  const fb = isValidIanaTimeZone(fallback) ? fallback : DEFAULT_TIMEZONE;
  if (!isValidIanaTimeZone(timeZone)) return fb;
  return String(timeZone).trim();
}

export function isValidIanaTimeZone(timeZone: string | undefined | null): boolean {
  if (!timeZone || !String(timeZone).trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: String(timeZone).trim() });
    return true;
  } catch {
    return false;
  }
}

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function toZonedParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const out: Partial<ZonedDateParts> = {};
  for (const part of parts) {
    if (part.type === "year") out.year = Number(part.value);
    if (part.type === "month") out.month = Number(part.value);
    if (part.type === "day") out.day = Number(part.value);
    if (part.type === "hour") out.hour = Number(part.value);
    if (part.type === "minute") out.minute = Number(part.value);
    if (part.type === "second") out.second = Number(part.value);
  }
  return {
    year: out.year ?? 0,
    month: out.month ?? 1,
    day: out.day ?? 1,
    hour: out.hour ?? 0,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = toZonedParts(date, timeZone);
  const zonedAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );
  return (zonedAsUtcMs - date.getTime()) / 60000;
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
): Date {
  const targetWallMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let guessMs = targetWallMs;
  for (let i = 0; i < 3; i += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(new Date(guessMs), timeZone);
    const adjusted = targetWallMs - offsetMinutes * 60 * 1000;
    if (adjusted === guessMs) break;
    guessMs = adjusted;
  }
  return new Date(guessMs);
}

function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  return zonedDateTimeToUtc(year, month, day, hour, minute, second, 0, normalizeTimeZone(timeZone));
}

function toDate(value: Date | string | number | undefined | null): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Session timezone, else browser IANA zone, else Asia/Kolkata (matches API `X-User-Timezone`). */
export function resolveUserTimeZone(): string {
  const sessionTz = getSessionUser()?.timezone?.trim();
  if (sessionTz && isValidIanaTimeZone(sessionTz)) return sessionTz;
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    if (browserTz && isValidIanaTimeZone(browserTz)) return browserTz;
  } catch {
    // ignore and fallback
  }
  return DEFAULT_TIMEZONE;
}

/** Calendar `YYYY-MM-DD` for `date` in the given IANA timezone (not UTC `toISOString`). */
export function formatYyyyMmDdInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayYmdInUserTz(): string {
  return formatYyyyMmDdInTimeZone(new Date(), resolveUserTimeZone());
}

/** en-GB datetime in IANA timezone (matches API export). */
export function formatDateTimeInTimeZone(
  value: Date | string | number | undefined | null,
  timeZone?: string,
): string {
  const date = toDate(value);
  if (!date) return EMPTY_DISPLAY;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizeTimeZone(timeZone ?? resolveUserTimeZone()),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTimeForUser(value: Date | string | number | undefined | null): string {
  return formatDateTimeInTimeZone(value, resolveUserTimeZone());
}

/** Calendar date only (en-GB) in user timezone. */
export function formatDateForUser(value: Date | string | number | undefined | null): string {
  const date = toDate(value);
  if (!date) return EMPTY_DISPLAY;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: resolveUserTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">` in the given timezone. */
export function utcIsoToDateTimeLocalValue(
  iso: string | Date | undefined | null,
  timeZone?: string,
): string {
  const date = toDate(iso);
  if (!date) return currentDateTimeLocalValue(timeZone);
  const tz = normalizeTimeZone(timeZone ?? resolveUserTimeZone());
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const min = parts.find((p) => p.type === "minute")?.value ?? "";
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function currentDateTimeLocalValue(timeZone?: string): string {
  return utcIsoToDateTimeLocalValue(new Date(), timeZone);
}

/** Parse datetime-local or ISO-with-offset → UTC ISO string. */
export function dateTimeLocalValueToUtcIso(
  value: string | undefined | null,
  timeZone?: string,
): string | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;

  if (HAS_ABSOLUTE_TZ_RE.test(trimmed)) {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }

  const match = trimmed.match(DATETIME_LOCAL_RE);
  if (match) {
    const [, y, mo, d, h, mi] = match;
    const utc = wallClockToUtc(
      Number(y),
      Number(mo),
      Number(d),
      Number(h),
      Number(mi),
      0,
      timeZone ?? resolveUserTimeZone(),
    );
    return utc.toISOString();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function normalizeDateTimeInputForApi(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return dateTimeLocalValueToUtcIso(trimmed) ?? undefined;
}
