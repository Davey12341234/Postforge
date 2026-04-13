import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStripeConfigured, planIdFromStripePriceId, stripePriceIdForPlan } from "./stripe-config";

describe("stripe-config", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_PRICE_STARTER", "");
    vi.stubEnv("STRIPE_PRICE_PRO", "");
    vi.stubEnv("STRIPE_PRICE_TEAM", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isStripeConfigured is false without secret key", () => {
    expect(isStripeConfigured()).toBe(false);
  });

  it("isStripeConfigured is true when STRIPE_SECRET_KEY is set", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_xxx");
    expect(isStripeConfigured()).toBe(true);
  });

  it("stripePriceIdForPlan maps env to price ids", () => {
    vi.stubEnv("STRIPE_PRICE_STARTER", "price_starter_1");
    vi.stubEnv("STRIPE_PRICE_PRO", "price_pro_1");
    vi.stubEnv("STRIPE_PRICE_TEAM", "price_team_1");
    expect(stripePriceIdForPlan("starter")).toBe("price_starter_1");
    expect(stripePriceIdForPlan("pro")).toBe("price_pro_1");
    expect(stripePriceIdForPlan("team")).toBe("price_team_1");
    expect(stripePriceIdForPlan("free")).toBeNull();
  });

  it("planIdFromStripePriceId resolves from env", () => {
    vi.stubEnv("STRIPE_PRICE_STARTER", "price_a");
    vi.stubEnv("STRIPE_PRICE_PRO", "price_b");
    vi.stubEnv("STRIPE_PRICE_TEAM", "price_c");
    expect(planIdFromStripePriceId("price_b")).toBe("pro");
    expect(planIdFromStripePriceId("unknown")).toBeNull();
    expect(planIdFromStripePriceId(null)).toBeNull();
  });
});
