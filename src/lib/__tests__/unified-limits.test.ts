import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkUsageLimits,
  getPlanConfig,
  getPlanLimits,
  isFeatureEnabled,
} from "@/lib/unified-limits";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    unifiedSubscription: { findUnique: vi.fn() },
    unifiedAnalyticsEvent: { count: vi.fn() },
    unifiedStudioDraft: { count: vi.fn() },
  },
}));

vi.mock("@/lib/unified-profile", () => ({
  getOrCreateUnifiedProfile: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";

describe("getPlanLimits", () => {
  it("returns free tier defaults for unknown plan keys", () => {
    const lim = getPlanLimits("unknown-plan");
    expect(lim).toEqual({
      credits: 100,
      generations: 50,
      drafts: 20,
      teamMembers: 1,
    });
  });

  it("tiers scale Pro → Business (high caps) → Enterprise (unlimited fields)", () => {
    const pro = getPlanLimits("pro");
    expect(pro.credits).toBe(2500);
    expect(pro.generations).toBe(800);
    expect(pro.drafts).toBe(800);

    const biz = getPlanLimits("business");
    expect(biz.credits).toBe(15000);
    expect(biz.generations).toBe(5000);
    expect(biz.teamMembers).toBe(25);

    const ent = getPlanLimits("enterprise");
    expect(ent.credits).toBe(-1);
    expect(ent.generations).toBe(-1);
  });
});

describe("getPlanConfig / isFeatureEnabled", () => {
  it("includes tier-appropriate feature flags", () => {
    expect(isFeatureEnabled("pro", "advanced_ai")).toBe(true);
    expect(isFeatureEnabled("free", "advanced_ai")).toBe(false);
    const cfg = getPlanConfig("business");
    expect(cfg.features).toContain("team_workspace");
  });
});

describe("checkUsageLimits", () => {
  beforeEach(() => {
    vi.mocked(getOrCreateUnifiedProfile).mockReset();
    vi.mocked(prisma.unifiedSubscription.findUnique).mockReset();
    vi.mocked(prisma.unifiedAnalyticsEvent.count).mockReset();
    vi.mocked(prisma.unifiedStudioDraft.count).mockReset();
  });

  it("blocks generation when period count meets max (free tier)", async () => {
    vi.mocked(getOrCreateUnifiedProfile).mockResolvedValue({
      id: "prof-1",
      subscriptionTier: "FREE",
      unifiedCredits: 50,
    } as Awaited<ReturnType<typeof getOrCreateUnifiedProfile>>);

    vi.mocked(prisma.unifiedSubscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.unifiedAnalyticsEvent.count).mockResolvedValue(50);
    vi.mocked(prisma.unifiedStudioDraft.count).mockResolvedValue(0);

    const r = await checkUsageLimits("user-1");
    expect(r.canGenerate).toBe(false);
    expect(r.remainingGenerations).toBe(0);
    expect(r.plan).toBe("free");
  });

  it("allows generation when under cap", async () => {
    vi.mocked(getOrCreateUnifiedProfile).mockResolvedValue({
      id: "prof-2",
      subscriptionTier: "PRO",
      unifiedCredits: 200,
    } as Awaited<ReturnType<typeof getOrCreateUnifiedProfile>>);

    vi.mocked(prisma.unifiedSubscription.findUnique).mockResolvedValue({
      plan: "pro",
      monthlyCreditsLimit: 2500,
      aiGenerationsLimit: 800,
      draftStorageLimit: 800,
      currentPeriodStart: new Date(Date.now() - 86400000),
      currentPeriodEnd: null,
    } as never);

    vi.mocked(prisma.unifiedAnalyticsEvent.count).mockResolvedValue(10);
    vi.mocked(prisma.unifiedStudioDraft.count).mockResolvedValue(3);

    const r = await checkUsageLimits("user-2");
    expect(r.canGenerate).toBe(true);
    expect(r.canSaveDraft).toBe(true);
    expect(r.limits.maxGenerations).toBe(800);
  });

  it("treats negative max generations as unlimited (business)", async () => {
    vi.mocked(getOrCreateUnifiedProfile).mockResolvedValue({
      id: "prof-3",
      subscriptionTier: "BUSINESS",
      unifiedCredits: 999999,
    } as Awaited<ReturnType<typeof getOrCreateUnifiedProfile>>);

    vi.mocked(prisma.unifiedSubscription.findUnique).mockResolvedValue({
      plan: "business",
      monthlyCreditsLimit: 999999,
      aiGenerationsLimit: 999999,
      draftStorageLimit: 999999,
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
    } as never);

    vi.mocked(prisma.unifiedAnalyticsEvent.count).mockResolvedValue(100000);
    vi.mocked(prisma.unifiedStudioDraft.count).mockResolvedValue(9000);

    const r = await checkUsageLimits("user-3");
    expect(r.canGenerate).toBe(true);
    expect(r.canSaveDraft).toBe(true);
    // 999999 cap − 100000 generations used in period
    expect(r.remainingGenerations).toBe(899999);
  });

  it("blocks draft save at storage boundary", async () => {
    vi.mocked(getOrCreateUnifiedProfile).mockResolvedValue({
      id: "prof-4",
      subscriptionTier: "FREE",
      unifiedCredits: 100,
    } as Awaited<ReturnType<typeof getOrCreateUnifiedProfile>>);

    vi.mocked(prisma.unifiedSubscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.unifiedAnalyticsEvent.count).mockResolvedValue(0);
    vi.mocked(prisma.unifiedStudioDraft.count).mockResolvedValue(20);

    const r = await checkUsageLimits("user-4");
    expect(r.canSaveDraft).toBe(false);
    expect(r.remainingDrafts).toBe(0);
  });
});
