import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeExchangeRateFromAmounts,
  computePlatformAmount,
  getCurrencyMinUnit,
  roundExchangeRate,
} from "./currencies";

describe("computePlatformAmount (forward)", () => {
  it("same currency uses rate 1", () => {
    assert.equal(computePlatformAmount(100.456, 99, "INR", "INR"), 100.46);
  });

  it("USD operated × rate → INR platform", () => {
    // 100 USD × 96 = 9600 INR
    assert.equal(computePlatformAmount(100, 96, "INR", "USD"), 9600);
  });

  it("AED operated × rate → USD platform", () => {
    // 3601.32 AED × 0.27229407 ≈ 980.62 USD
    const platform = computePlatformAmount(3601.32, 0.27229407, "USD", "AED");
    assert.equal(platform, 980.62);
  });
});

describe("computeExchangeRateFromAmounts (reverse)", () => {
  it("same currency returns 1", () => {
    assert.equal(computeExchangeRateFromAmounts(500, 500, "INR", "INR"), 1);
  });

  it("back-solves rate from INR platform and USD operated", () => {
    const rate = computeExchangeRateFromAmounts(9600, 100, "INR", "USD");
    assert.equal(rate, 96);
  });

  it("round-trips: reverse then forward within platform minor unit", () => {
    const operated = 300;
    const targetPlatform = 28800;
    const rate = computeExchangeRateFromAmounts(targetPlatform, operated, "INR", "USD");
    assert.ok(Number.isFinite(rate) && rate > 0);
    const recomputed = computePlatformAmount(operated, rate, "INR", "USD");
    const minUnit = getCurrencyMinUnit("INR");
    assert.ok(Math.abs(recomputed - targetPlatform) <= minUnit + Number.EPSILON);
  });

  it("AED/USD reverse then forward stays within minor unit", () => {
    const operated = 3601.32;
    const targetPlatform = 980.62;
    const rate = computeExchangeRateFromAmounts(targetPlatform, operated, "USD", "AED");
    assert.equal(rate, roundExchangeRate(targetPlatform / operated));
    const recomputed = computePlatformAmount(operated, rate, "USD", "AED");
    const minUnit = getCurrencyMinUnit("USD");
    assert.ok(Math.abs(recomputed - targetPlatform) <= minUnit + Number.EPSILON);
  });

  it("guards operated ≤ 0 and non-finite", () => {
    assert.ok(Number.isNaN(computeExchangeRateFromAmounts(100, 0, "INR", "USD")));
    assert.ok(Number.isNaN(computeExchangeRateFromAmounts(100, -1, "INR", "USD")));
    assert.ok(Number.isNaN(computeExchangeRateFromAmounts(NaN, 10, "INR", "USD")));
    assert.ok(Number.isNaN(computeExchangeRateFromAmounts(100, NaN, "INR", "USD")));
  });
});
