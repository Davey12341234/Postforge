import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatPlanMoneyHeadline, getMonthlyUsdCents, planPriceConfigured } from "./plan-pricing-display";

describe("plan-pricing-display", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_STARTER_USD", "");
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_PRO_USD", "");
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_TEAM_USD", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("free is zero", () => {
    expect(getMonthlyUsdCents("free")).toBe(0);
    expect(formatPlanMoneyHeadline("free")).toBe("$0");
    expect(planPriceConfigured("free")).toBe(true);
  });

  it("reads starter USD from env", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_STARTER_USD", "12");
    expect(getMonthlyUsdCents("starter")).toBe(1200);
    expect(formatPlanMoneyHeadline("starter")).toBe("$12/mo");
    expect(planPriceConfigured("starter")).toBe(true);
  });

  it("missing env uses built-in list defaults for display", () => {
    expect(getMonthlyUsdCents("starter")).toBe(1200);
    expect(formatPlanMoneyHeadline("starter")).toBe("$12/mo");
    expect(getMonthlyUsdCents("pro")).toBe(2400);
    expect(formatPlanMoneyHeadline("pro")).toBe("$24/mo");
    expect(getMonthlyUsdCents("team")).toBe(6900);
    expect(formatPlanMoneyHeadline("team")).toBe("$69/mo");
    expect(planPriceConfigured("pro")).toBe(false);
  });

  it("env overrides defaults", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_PRO_USD", "29");
    expect(getMonthlyUsdCents("pro")).toBe(2900);
    expect(formatPlanMoneyHeadline("pro")).toBe("$29/mo");
    expect(planPriceConfigured("pro")).toBe(true);
  });
});
