import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  currentDateTimeLocalValue,
  dateTimeLocalValueToUtcIso,
  formatDateTimeInTimeZone,
  utcIsoToDateTimeLocalValue,
} from "./userTimezone";

const LONDON = "Europe/London";
const KOLKATA = "Asia/Kolkata";

describe("userTimezone display and datetime-local", () => {
  it("formats UTC instant as Europe/London en-GB datetime", () => {
    const out = formatDateTimeInTimeZone("2026-05-24T23:00:00.000Z", LONDON);
    assert.equal(out, "25/05/2026, 00:00:00");
  });

  it("round-trips London midnight via datetime-local", () => {
    const iso = "2026-05-24T23:00:00.000Z";
    const local = utcIsoToDateTimeLocalValue(iso, LONDON);
    assert.equal(local, "2026-05-25T00:00");
    const back = dateTimeLocalValueToUtcIso(local, LONDON);
    assert.equal(back, iso);
  });

  it("round-trips Kolkata wall clock via datetime-local", () => {
    const iso = "2026-05-25T16:45:00.000Z";
    const local = utcIsoToDateTimeLocalValue(iso, KOLKATA);
    assert.equal(local, "2026-05-25T22:15");
    const back = dateTimeLocalValueToUtcIso(local, KOLKATA);
    assert.equal(back, iso);
  });

  it("currentDateTimeLocalValue returns YYYY-MM-DDTHH:mm shape", () => {
    const v = currentDateTimeLocalValue(LONDON);
    assert.match(v, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
