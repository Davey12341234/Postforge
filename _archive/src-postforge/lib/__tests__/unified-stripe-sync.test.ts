import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    unifiedSubscription: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    unifiedStudioProfile: { update: vi.fn() },
    unifiedAnalyticsEvent: { create: vi.fn() },
    unifiedInvoice: { create: vi.fn() },
    unifiedPayment: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  applyPlanLimitsToSubscriptionData,
  mapPlanToTier,
  processCheckoutSessionCompleted,
  processCustomerSubscriptionChange,
  processInvoicePaid,
  processInvoicePaymentFailed,
} from "@/lib/unified-stripe-sync";

const upsert = vi.mocked(prisma.unifiedSubscription.upsert);
const subFindFirst = vi.mocked(prisma.unifiedSubscription.findFirst);
const subUpdate = vi.mocked(prisma.unifiedSubscription.update);
const profileUpdate = vi.mocked(prisma.unifiedStudioProfile.update);
const analyticsCreate = vi.mocked(prisma.unifiedAnalyticsEvent.create);
const invoiceCreate = vi.mocked(prisma.unifiedInvoice.create);
const paymentCreate = vi.mocked(prisma.unifiedPayment.create);

function checkoutSession(
  overrides: Partial<Stripe.Checkout.Session> & {
    metadata?: Record<string, string>;
  },
): Stripe.Checkout.Session {
  return {
    id: "cs_test_1",
    object: "checkout.session",
    metadata: {},
    ...overrides,
  } as Stripe.Checkout.Session;
}

function stripeSubscription(
  overrides: Partial<Stripe.Subscription>,
): Stripe.Subscription {
  return {
    id: "sub_test_1",
    object: "subscription",
    status: "active",
    customer: "cus_1",
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
    cancel_at_period_end: false,
    ...overrides,
  } as Stripe.Subscription;
}

function stripeInvoice(overrides: Partial<Stripe.Invoice>): Stripe.Invoice {
  return {
    id: "in_test_1",
    object: "invoice",
    customer: "cus_1",
    amount_paid: 1999,
    amount_due: 0,
    status: "paid",
    currency: "usd",
    attempt_count: 1,
    ...overrides,
  } as Stripe.Invoice;
}

describe("mapPlanToTier / applyPlanLimitsToSubscriptionData", () => {
  it("maps paid plans to enum tiers", () => {
    expect(mapPlanToTier("pro")).toBe("PRO");
    expect(mapPlanToTier("business")).toBe("BUSINESS");
    expect(mapPlanToTier("enterprise")).toBe("ENTERPRISE");
    expect(mapPlanToTier("nope")).toBe("FREE");
  });

  it("uses finite caps for business and sentinels for enterprise", () => {
    const b = applyPlanLimitsToSubscriptionData("business");
    expect(b.monthlyCreditsLimit).toBe(15000);
    expect(b.aiGenerationsLimit).toBe(5000);

    const e = applyPlanLimitsToSubscriptionData("enterprise");
    expect(e.monthlyCreditsLimit).toBe(999999);
    expect(e.aiGenerationsLimit).toBe(999999);

    const p = applyPlanLimitsToSubscriptionData("pro");
    expect(p.aiGenerationsLimit).toBe(800);
  });
});

describe("processCheckoutSessionCompleted", () => {
  beforeEach(() => {
    upsert.mockReset();
    profileUpdate.mockReset();
    analyticsCreate.mockReset();
  });

  it("is a no-op when profileId is missing (partial / abandoned checkout)", async () => {
    await processCheckoutSessionCompleted(
      checkoutSession({ metadata: { plan: "pro" } }),
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts subscription, upgrades profile tier, logs analytics", async () => {
    await processCheckoutSessionCompleted(
      checkoutSession({
        id: "cs_full",
        metadata: {
          profileId: "prof_a",
          plan: "business",
          priceId: "price_123",
        },
        customer: "cus_a",
        subscription: "sub_a",
      }),
    );

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].create.plan).toBe("business");
    expect(profileUpdate).toHaveBeenCalledWith({
      where: { id: "prof_a" },
      data: { subscriptionTier: "BUSINESS" },
    });
    expect(analyticsCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventName: "stripe_checkout_completed",
        profileId: "prof_a",
      }),
    });
  });

  it("handles concurrent completion calls for the same profile (race-safe upsert)", async () => {
    const session = checkoutSession({
      metadata: {
        profileId: "prof_race",
        plan: "pro",
        priceId: "price_p",
      },
      customer: "cus_r",
      subscription: "sub_r",
    });

    await Promise.all([
      processCheckoutSessionCompleted(session),
      processCheckoutSessionCompleted(session),
      processCheckoutSessionCompleted(session),
    ]);

    expect(upsert).toHaveBeenCalledTimes(3);
  });
});

describe("processCustomerSubscriptionChange", () => {
  beforeEach(() => {
    subFindFirst.mockReset();
    subUpdate.mockReset();
    profileUpdate.mockReset();
    analyticsCreate.mockReset();
  });

  it("downgrades profile to FREE when subscription is past_due or canceled", async () => {
    subFindFirst.mockResolvedValue({
      id: "row1",
      profileId: "prof_x",
      plan: "pro",
    } as never);

    await processCustomerSubscriptionChange(
      stripeSubscription({ status: "canceled" }),
    );

    expect(subUpdate).toHaveBeenCalled();
    expect(profileUpdate).toHaveBeenCalledWith({
      where: { id: "prof_x" },
      data: { subscriptionTier: "FREE" },
    });
  });

  it("keeps tier when status is active (paid)", async () => {
    subFindFirst.mockResolvedValue({
      id: "row2",
      profileId: "prof_y",
      plan: "business",
    } as never);

    await processCustomerSubscriptionChange(
      stripeSubscription({ status: "active" }),
    );

    expect(profileUpdate).toHaveBeenCalledWith({
      where: { id: "prof_y" },
      data: { subscriptionTier: "BUSINESS" },
    });
  });

  it("rollback path: no DB row for Stripe customer → no throw", async () => {
    subFindFirst.mockResolvedValue(null);
    await expect(
      processCustomerSubscriptionChange(stripeSubscription({})),
    ).resolves.toBeUndefined();
    expect(subUpdate).not.toHaveBeenCalled();
  });
});

describe("invoice handlers", () => {
  beforeEach(() => {
    subFindFirst.mockReset();
    invoiceCreate.mockReset();
    paymentCreate.mockReset();
    analyticsCreate.mockReset();
  });

  it("records invoice + payment on invoice.paid", async () => {
    subFindFirst.mockResolvedValue({ profileId: "prof_inv" } as never);
    await processInvoicePaid(stripeInvoice({ id: "in_1" }));
    expect(invoiceCreate).toHaveBeenCalled();
    expect(paymentCreate).toHaveBeenCalled();
  });

  it("logs payment_failed analytics (expired card / declined)", async () => {
    subFindFirst.mockResolvedValue({ profileId: "prof_fail" } as never);
    await processInvoicePaymentFailed(
      stripeInvoice({
        id: "in_fail",
        status: "open",
        attempt_count: 3,
      }),
    );
    expect(analyticsCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventName: "payment_failed",
        properties: expect.objectContaining({ attemptCount: 3 }),
      }),
    });
    expect(invoiceCreate).not.toHaveBeenCalled();
  });
});

