import { describe, expect, it, vi } from "vitest";
import {
  extractSubscriptionPriceId,
  resolvePlanFromStripePriceId,
} from "@/lib/unified-stripe-plan";

describe("resolvePlanFromStripePriceId", () => {
  it("maps env price ids to plan keys", () => {
    vi.stubEnv("STRIPE_PRICE_PRO", "price_pro_test");
    vi.stubEnv("STRIPE_PRICE_BUSINESS", "price_biz_test");
    vi.stubEnv("STRIPE_PRICE_ENTERPRISE", "price_ent_test");

    expect(resolvePlanFromStripePriceId("price_pro_test")).toBe("pro");
    expect(resolvePlanFromStripePriceId("price_biz_test")).toBe("business");
    expect(resolvePlanFromStripePriceId("price_ent_test")).toBe("enterprise");
    expect(resolvePlanFromStripePriceId("price_unknown")).toBeNull();

    vi.unstubAllEnvs();
  });
});

describe("extractSubscriptionPriceId", () => {
  it("reads string or expanded price id", () => {
    expect(
      extractSubscriptionPriceId({
        items: { data: [{ price: "price_123" }] },
      }),
    ).toBe("price_123");
    expect(
      extractSubscriptionPriceId({
        items: { data: [{ price: { id: "price_456" } }] },
      }),
    ).toBe("price_456");
  });
});
