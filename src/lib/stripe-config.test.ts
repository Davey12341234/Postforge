import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStripeConfigured, planIdFromStripePriceId, stripePriceIdForPlan } from "./stripe-config";

describe("stripe-config", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_PRICE_STARTER", "");
    vi.stubEnv("STRIPE_PRICE_PRO", "");
    vi.stubEnv("STRIPE_PRICE_TEAM", "");
    vi.stubEnv("STRIPE_PRICE_STARTER_YEARLY", "");
    vi.stubEnv("STRIPE_PRICE_PRO_YEARLY", "");
    vi.stubEnv("STRIPE_PRICE_TEAM_YEARLY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isStripeConfigured is false without secret key", () => {
    expect(isStripeConfigured()).toBe(false);
  });

  const validTestSecret = `sk_test_${"x".repeat(95)}`;

  it("isStripeConfigured is true when STRIPE_SECRET_KEY is a valid secret shape", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", validTestSecret);
    expect(isStripeConfigured()).toBe(true);
  });

  it("isStripeConfigured is false for publishable key or truncated secret", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "pk_test_xxx");
    expect(isStripeConfigured()).toBe(false);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_short");
    expect(isStripeConfigured()).toBe(false);
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

  it("stripePriceIdForPlan annual uses YEARLY env ids", () => {
    vi.stubEnv("STRIPE_PRICE_STARTER_YEARLY", "price_starter_y");
    vi.stubEnv("STRIPE_PRICE_PRO_YEARLY", "price_pro_y");
    vi.stubEnv("STRIPE_PRICE_TEAM_YEARLY", "price_team_y");
    expect(stripePriceIdForPlan("starter", "annual")).toBe("price_starter_y");
    expect(stripePriceIdForPlan("pro", "annual")).toBe("price_pro_y");
    expect(stripePriceIdForPlan("team", "annual")).toBe("price_team_y");
    expect(stripePriceIdForPlan("starter", "monthly")).toBeNull();
  });

  it("planIdFromStripePriceId resolves from env", () => {
    vi.stubEnv("STRIPE_PRICE_STARTER", "price_a");
    vi.stubEnv("STRIPE_PRICE_PRO", "price_b");
    vi.stubEnv("STRIPE_PRICE_TEAM", "price_c");
    expect(planIdFromStripePriceId("price_b")).toBe("pro");
    expect(planIdFromStripePriceId("unknown")).toBeNull();
    expect(planIdFromStripePriceId(null)).toBeNull();
  });

  it("planIdFromStripePriceId resolves yearly price ids", () => {
    vi.stubEnv("STRIPE_PRICE_PRO_YEARLY", "price_pro_year");
    expect(planIdFromStripePriceId("price_pro_year")).toBe("pro");
  });
});
