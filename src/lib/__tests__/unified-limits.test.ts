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

  it("enforces bounded caps for pro and sentinel -1 for business unlimited fields", () => {
    const pro = getPlanLimits("pro");
    expect(pro.generations).toBe(500);
    expect(pro.drafts).toBe(500);

    const biz = getPlanLimits("business");
    expect(biz.credits).toBe(-1);
    expect(biz.generations).toBe(-1);
    expect(biz.teamMembers).toBe(25);
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
      monthlyCreditsLimit: 1000,
      aiGenerationsLimit: 500,
      draftStorageLimit: 500,
      currentPeriodStart: new Date(Date.now() - 86400000),
      currentPeriodEnd: null,
    } as never);

    vi.mocked(prisma.unifiedAnalyticsEvent.count).mockResolvedValue(10);
    vi.mocked(prisma.unifiedStudioDraft.count).mockResolvedValue(3);

    const r = await checkUsageLimits("user-2");
    expect(r.canGenerate).toBe(true);
    expect(r.canSaveDraft).toBe(true);
    expect(r.limits.maxGenerations).toBe(500);
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
