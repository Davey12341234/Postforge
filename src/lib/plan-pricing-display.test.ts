import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatPlanMoneyHeadline,
  getAnnualUsdCents,
  getMonthlyUsdCents,
  planAnnualPriceConfigured,
  planPriceConfigured,
} from "./plan-pricing-display";

describe("plan-pricing-display", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_STARTER_USD", "");
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_PRO_USD", "");
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_TEAM_USD", "");
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_STARTER_YEARLY_USD", "");
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_PRO_YEARLY_USD", "");
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_TEAM_YEARLY_USD", "");
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

  it("annual defaults (~10× monthly list for discount vs ×12)", () => {
    expect(getAnnualUsdCents("starter")).toBe(12000);
    expect(formatPlanMoneyHeadline("starter", "annual")).toBe("$120/yr");
    expect(getAnnualUsdCents("pro")).toBe(24000);
    expect(formatPlanMoneyHeadline("pro", "annual")).toBe("$240/yr");
    expect(getAnnualUsdCents("team")).toBe(69000);
    expect(formatPlanMoneyHeadline("team", "annual")).toBe("$690/yr");
    expect(planAnnualPriceConfigured("pro")).toBe(false);
  });

  it("env overrides defaults", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_PRO_USD", "29");
    expect(getMonthlyUsdCents("pro")).toBe(2900);
    expect(formatPlanMoneyHeadline("pro")).toBe("$29/mo");
    expect(planPriceConfigured("pro")).toBe(true);
  });
});
