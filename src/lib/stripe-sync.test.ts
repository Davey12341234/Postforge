import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const writeServerBilling = vi.fn();
const readServerBilling = vi.fn();
const setServerPlan = vi.fn();

vi.mock("./server-billing", () => ({
  readServerBilling: () => readServerBilling(),
  writeServerBilling: (r: unknown) => writeServerBilling(r),
}));

vi.mock("./server-wallet", () => ({
  setServerPlan: (id: unknown) => setServerPlan(id),
}));

vi.mock("./stripe-config", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./stripe-config")>();
  return {
    ...mod,
    planIdFromStripePriceId: (id: string | null | undefined) =>
      id === "price_map_pro" ? "pro" : id === "price_map_starter" ? "starter" : null,
  };
});

import { applyStripeSubscription, clearStripeSubscriptionToFree } from "./stripe-sync";

function mockSub(overrides: Partial<{ status: Stripe.Subscription.Status; priceId: string; customer: string }>): Stripe.Subscription {
  const status = overrides.status ?? "active";
  const priceId = overrides.priceId ?? "price_map_pro";
  const customer = overrides.customer ?? "cus_test";
  return {
    id: "sub_test",
    object: "subscription",
    status,
    customer,
    items: {
      object: "list",
      data: [{ id: "si_1", price: { id: priceId } }],
    },
  } as Stripe.Subscription;
}

describe("stripe-sync", () => {
  beforeEach(() => {
    writeServerBilling.mockClear();
    setServerPlan.mockClear();
    readServerBilling.mockReturnValue({
      customerId: "cus_prev",
      subscriptionId: "sub_old",
      status: "active",
      priceId: "price_old",
    });
  });

  it("applyStripeSubscription sets plan from price when subscription is active", () => {
    applyStripeSubscription(mockSub({ status: "active", priceId: "price_map_pro" }));
    expect(writeServerBilling).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_test",
        subscriptionId: "sub_test",
        status: "active",
        priceId: "price_map_pro",
      }),
    );
    expect(setServerPlan).toHaveBeenCalledWith("pro");
  });

  it("applyStripeSubscription sets starter when price maps to starter", () => {
    applyStripeSubscription(mockSub({ priceId: "price_map_starter" }));
    expect(setServerPlan).toHaveBeenCalledWith("starter");
  });

  it("applyStripeSubscription sets free when status is canceled", () => {
    applyStripeSubscription(mockSub({ status: "canceled" }));
    expect(setServerPlan).toHaveBeenCalledWith("free");
  });

  it("clearStripeSubscriptionToFree resets billing and plan", () => {
    clearStripeSubscriptionToFree("cus_keep");
    expect(writeServerBilling).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_keep",
        subscriptionId: null,
        status: "canceled",
        priceId: null,
      }),
    );
    expect(setServerPlan).toHaveBeenCalledWith("free");
  });
});
