import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/unified-profile", () => ({
  getOrCreateUnifiedProfile: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    unifiedSubscription: { findUnique: vi.fn() },
  },
}));

vi.mock("stripe", () => {
  return {
    default: class {
      customers = { create: vi.fn() };
      checkout = { sessions: { create: vi.fn() } };
    },
  };
});

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";
import { POST } from "../route";

describe("POST /api/unified/checkout", () => {
  it("returns 401 when not signed in", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/unified/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "pro" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 409 when already on the requested active plan", async () => {
    const prevKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", email: "a@b.com" },
    } as never);
    vi.mocked(getOrCreateUnifiedProfile).mockResolvedValue({
      id: "prof1",
    } as never);
    vi.mocked(prisma.unifiedSubscription.findUnique).mockResolvedValue({
      plan: "pro",
      status: "active",
    } as never);

    const req = new NextRequest("http://localhost/api/unified/checkout", {
      method: "POST",
      body: JSON.stringify({ planId: "pro" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/Already subscribed/i);
    process.env.STRIPE_SECRET_KEY = prevKey;
  });

  it("returns 500 when Stripe price id is not configured", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const prevKey = process.env.STRIPE_SECRET_KEY;
    const prev = process.env.STRIPE_PRICE_PRO;
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
    process.env.STRIPE_PRICE_PRO = "";
    try {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "u2", email: "c@d.com" },
      } as never);
      vi.mocked(getOrCreateUnifiedProfile).mockResolvedValue({
        id: "prof2",
      } as never);
      vi.mocked(prisma.unifiedSubscription.findUnique).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/unified/checkout", {
        method: "POST",
        body: JSON.stringify({ planId: "pro" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    } finally {
      process.env.STRIPE_PRICE_PRO = prev;
      process.env.STRIPE_SECRET_KEY = prevKey;
      errSpy.mockRestore();
    }
  });
});
