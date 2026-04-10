"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import UpgradePrompt from "@/components/unified/UpgradePrompt";
import type { UpgradePromptType } from "@/components/unified/UpgradePrompt";
import {
  UnifiedAPIError,
  isLikelyNetworkError,
  isUnifiedAPIError,
} from "@/lib/unified-api-error";
import { LEVELS, xpProgressInLevel } from "@/lib/unified-gamification";

type TabId = "home" | "create" | "drafts" | "publish" | "stats";

type Toast = { id: string; msg: string; type?: "ok" | "error" | "warn" };

type MissionRow = {
  id: string;
  missionKey: string;
  title: string;
  description: string | null;
  progress: number;
  target: number;
  status: string;
  xpReward: number;
};

type ProgressPayload = {
  profile: {
    xpTotal: number;
    level: number;
    streakCount: number;
    unifiedCredits: number;
    subscriptionTier: string;
  };
  missions: MissionRow[];
  referralCode: string | null;
};

type AnalyticsPayload = {
  overview: {
    totalEvents: number;
    totalDrafts: number;
    publishedDrafts: number;
    currentLevel: number;
    totalXP: number;
    creditsRemaining: number;
  };
  statsByType: Record<string, number>;
  dailyActivity: Array<{
    date: string;
    total: number;
    breakdown: Record<string, number>;
  }>;
  recentActivity: Array<{
    id: string;
    eventName: string;
    properties: unknown;
    timestamp: string;
  }>;
  period?: { start: string; end: string };
};

type DraftRow = {
  id: string;
  caption: string;
  platform: string;
  at: string;
  source: "cloud" | "local";
  status?: string;
};

const LOCAL_DRAFTS_KEY = "unified-drafts";

const UNIFIED_API = {
  getAnalytics: async (): Promise<AnalyticsPayload> => {
    const res = await fetch("/api/unified/analytics");
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },
  credits: {
    getBalance: async () => {
      const res = await fetch("/api/unified/credits");
      if (!res.ok) throw new Error("Failed to fetch credits");
      return res.json();
    },
    addCredits: async (amount: number, reason?: string, missionId?: string) => {
      const res = await fetch("/api/unified/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason, missionId }),
      });
      if (!res.ok) throw new Error("Failed to update credits");
      return res.json();
    },
  },
  settings: {
    get: async () => {
      const res = await fetch("/api/unified/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json() as Promise<{ settings: Record<string, unknown> }>;
    },
    save: async (settings: Record<string, unknown>) => {
      const res = await fetch("/api/unified/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json() as Promise<{
        success: boolean;
        settings?: Record<string, unknown>;
      }>;
    },
  },
  checkout: {
    createSession: async (
      planId: "pro" | "business" | "enterprise",
      mode: "subscription" | "payment" = "subscription",
    ) => {
      let res: Response;
      try {
        res = await fetch("/api/unified/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, mode }),
        });
      } catch {
        throw new UnifiedAPIError(
          "Network error — check your connection.",
          0,
          {},
        );
      }
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        throw UnifiedAPIError.fromResponse(res.status, data);
      }
      if (data.url) {
        window.location.href = data.url;
      }
      return data;
    },
  },
  drafts: {
    list: async (opts?: { status?: string }) => {
      const q = opts?.status
        ? `?status=${encodeURIComponent(opts.status)}`
        : "";
      const res = await fetch(`/api/unified/drafts${q}`);
      if (!res.ok) throw new Error("Failed to list drafts");
      return res.json() as Promise<{
        drafts: Array<{
          id: string;
          caption: string;
          platform: string | null;
          status: string;
          createdAt: string;
          updatedAt: string;
        }>;
      }>;
    },
    create: async (payload: {
      content: string;
      title?: string;
      platform?: string;
      type?: string;
      metadata?: Record<string, unknown>;
      localId?: string;
      status?: "DRAFT" | "READY" | "SCHEDULED" | "PUBLISHED";
    }) => {
      const res = await fetch("/api/unified/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save draft");
      return res.json() as Promise<{
        id: string;
        caption: string;
        platform: string | null;
        status: string;
        createdAt: string;
        updatedAt: string;
      }>;
    },
    update: async (
      id: string,
      updates: {
        caption?: string;
        content?: string;
        platform?: string | null;
        status?: "DRAFT" | "READY" | "SCHEDULED" | "PUBLISHED";
      },
    ) => {
      const res = await fetch(`/api/unified/drafts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update draft");
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/unified/drafts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete draft");
      return res.json();
    },
  },
  generateContent: async (body: {
    prompt: string;
    platform?: string;
    contentType?: string;
    options?: {
      tone?: string;
      maxLength?: number;
      includeHashtags?: boolean;
      includeEmojis?: boolean;
    };
  }) => {
    let res: Response;
    try {
      res = await fetch("/api/unified/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new UnifiedAPIError(
        "Network error — check your connection.",
        0,
        {},
      );
    }
    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      throw UnifiedAPIError.fromResponse(res.status, data);
    }
    return data as {
      success: boolean;
      content: string;
      usage?: { model?: string; tokens?: number };
    };
  },
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function PricingModal({
  open,
  onClose,
  currentTier,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  currentTier: string;
  onPick: (tier: "FREE" | "PRO" | "ENTERPRISE") => void;
}) {
  if (!open) return null;
  const plans = [
    {
      id: "FREE" as const,
      name: "Free",
      price: "$0",
      sub: "100 credits / mo",
      badge: "Start here",
      popular: false,
    },
    {
      id: "PRO" as const,
      name: "Pro",
      price: "$19",
      sub: "per month · 2K credits",
      badge: "Most popular",
      popular: true,
    },
    {
      id: "ENTERPRISE" as const,
      name: "Enterprise",
      price: "$99",
      sub: "per month · white-glove",
      badge: "Teams",
      popular: false,
    },
  ];
  return (
    <div className="ucs-modal-back" role="dialog" aria-modal="true">
      <div className="ucs-modal">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
              Upgrade studio
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#a1a1aa" }}>
              Cancel anytime · 7-day trial on Pro
            </p>
          </div>
          <button
            type="button"
            className="ucs-btn ucs-btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => void onPick(p.id)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: 14,
                border:
                  p.popular
                    ? "1px solid rgba(236,72,153,0.45)"
                    : "1px solid rgba(255,255,255,0.08)",
                background: p.popular
                  ? "rgba(236,72,153,0.08)"
                  : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                color: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                {currentTier === p.id && (
                  <span style={{ fontSize: 11, color: "#86efac" }}>Current</span>
                )}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                {p.price}{" "}
                <span style={{ fontSize: 12, fontWeight: 500, color: "#a1a1aa" }}>
                  {p.sub}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#d4d4d8", marginTop: 4 }}>
                {p.badge}
              </div>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#71717a", marginTop: 14 }}>
          Pro / Enterprise open Stripe Checkout when keys and price IDs are configured.
        </p>
      </div>
    </div>
  );
}

export default function UnifiedStudioClient({
  userId: _userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [tab, setTab] = useState<TabId>("home");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showPricing, setShowPricing] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptType, setUpgradePromptType] =
    useState<UpgradePromptType>("generation_limit");
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Hi! I’m your content copilot. Ask for hooks, threads, or a full caption — I’ll keep it platform-aware.",
    },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [isSyncingDrafts, setIsSyncingDrafts] = useState(false);
  const [userSettings, setUserSettings] = useState<Record<string, unknown>>({
    tone: "professional",
    language: "english",
    autoSaveDrafts: true,
    maxLength: 500,
    includeHashtags: true,
    includeEmojis: true,
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsPayload | null>(
    null,
  );
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genPlatform, setGenPlatform] = useState("instagram");
  const [genContentType, setGenContentType] = useState("post");
  const [genOutput, setGenOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [online, setOnline] = useState(true);
  const [publishPlatform, setPublishPlatform] = useState("instagram");
  const [publishCaption, setPublishCaption] = useState("");
  const streakSent = useRef(false);

  const showToast = useCallback((msg: string, type: Toast["type"] = "ok") => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const loadProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/unified/user/progress");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as ProgressPayload;
      setProgress(data);
      setLoadErr(null);
    } catch {
      setLoadErr("Could not load studio profile. Try refreshing.");
    }
  }, []);

  const loadCloudDrafts = useCallback(async () => {
    setIsSyncingDrafts(true);
    try {
      const { drafts: apiDrafts } = await UNIFIED_API.drafts.list();
      const cloudRows: DraftRow[] = apiDrafts.map((d) => ({
        id: d.id,
        caption: d.caption,
        platform: d.platform ?? "—",
        at:
          typeof d.createdAt === "string"
            ? d.createdAt
            : new Date(d.createdAt).toISOString(),
        source: "cloud",
        status: d.status,
      }));
      let localRows: DraftRow[] = [];
      try {
        const raw =
          typeof window !== "undefined"
            ? localStorage.getItem(LOCAL_DRAFTS_KEY)
            : null;
        if (raw) {
          const parsed = JSON.parse(raw) as Array<{
            id: string;
            caption: string;
            platform?: string;
            at?: string;
          }>;
          const cloudIds = new Set(cloudRows.map((r) => r.id));
          localRows = parsed
            .filter((p) => !cloudIds.has(p.id))
            .map((p) => ({
              id: p.id,
              caption: p.caption,
              platform: p.platform ?? "—",
              at: p.at ?? new Date().toISOString(),
              source: "local" as const,
            }));
        }
      } catch {
        /* ignore */
      }
      setDrafts([...cloudRows, ...localRows]);
    } catch {
      try {
        const raw = localStorage.getItem(LOCAL_DRAFTS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Array<{
            id: string;
            caption: string;
            platform?: string;
            at?: string;
          }>;
          setDrafts(
            parsed.map((p) => ({
              id: p.id,
              caption: p.caption,
              platform: p.platform ?? "—",
              at: p.at ?? new Date().toISOString(),
              source: "local" as const,
            })),
          );
        }
      } catch {
        /* ignore */
      }
    } finally {
      setIsSyncingDrafts(false);
    }
  }, []);

  const loadUserSettings = useCallback(async () => {
    try {
      const { settings } = await UNIFIED_API.settings.get();
      if (settings && typeof settings === "object") {
        setUserSettings((prev) => ({ ...prev, ...settings }));
      }
    } catch {
      /* defaults */
    }
  }, []);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const data = await UNIFIED_API.getAnalytics();
      setAnalyticsData(data);
    } catch {
      setAnalyticsData(null);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    void loadProgress();
    void loadCloudDrafts();
    void loadUserSettings();
  }, [loadProgress, loadCloudDrafts, loadUserSettings]);

  useEffect(() => {
    if (tab === "stats") {
      void loadAnalyticsData();
    }
  }, [tab, loadAnalyticsData]);

  useEffect(() => {
    if (!progress || streakSent.current) return;
    streakSent.current = true;
    void (async () => {
      try {
        await fetch("/api/unified/user/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "tick_streak" }),
        });
        await loadProgress();
      } catch {
        /* ignore */
      }
    })();
  }, [progress, loadProgress]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const xpInfo = progress
    ? xpProgressInLevel(progress.profile.xpTotal)
    : xpProgressInLevel(0);

  const sendChat = async () => {
    const t = input.trim();
    if (!t || chatLoading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: t }]);
    setChatLoading(true);
    try {
      const next = [...messages, { role: "user" as const, content: t }];
      const res = await fetch("/api/unified/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-12).map((x) => ({
            role: x.role,
            content: x.content,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
        code?: string;
      };
      if (res.status === 402) {
        if (data.code === "LIMIT_REACHED") {
          setUpgradePromptType("generation_limit");
          setShowUpgradePrompt(true);
        } else {
          setUpgradePromptType("credits");
          setShowUpgradePrompt(true);
          showToast("Not enough unified credits.", "warn");
          setShowPricing(true);
        }
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Chat failed");
      }
      const reply = data.text?.trim() ?? "(No text returned)";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      await loadProgress();
    } catch (e: unknown) {
      if (isLikelyNetworkError(e)) {
        showToast("Network error — check your connection.", "error");
      } else {
        const msg = e instanceof Error ? e.message : "Chat error";
        showToast(msg, "error");
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    let prompt = genPrompt.trim();
    if (!prompt) {
      showToast("Please enter a prompt", "warn");
      return;
    }
    const lang = String(userSettings.language ?? "english");
    if (lang && lang !== "english") {
      prompt = `(Write in ${lang}.)\n\n${prompt}`;
    }
    setIsGenerating(true);
    setGenOutput("");
    try {
      const tone =
        typeof userSettings.tone === "string"
          ? userSettings.tone
          : "professional";
      const maxLength =
        typeof userSettings.maxLength === "number"
          ? userSettings.maxLength
          : 500;
      const includeHashtags = userSettings.includeHashtags !== false;
      const includeEmojis = userSettings.includeEmojis !== false;
      const result = await UNIFIED_API.generateContent({
        prompt,
        platform: genPlatform,
        contentType: genContentType,
        options: {
          tone,
          maxLength,
          includeHashtags,
          includeEmojis,
        },
      });
      setGenOutput(result.content);
      showToast("Content generated!", "ok");
      await loadProgress();
      const autoSave =
        userSettings.autoSaveDrafts !== false &&
        userSettings.autoSaveDrafts !== "false";
      if (autoSave) {
        try {
          await UNIFIED_API.drafts.create({
            content: result.content,
            title: `${genContentType} for ${genPlatform}`,
            platform: genPlatform,
            type: genContentType,
            metadata: {
              generatedAt: new Date().toISOString(),
              model: result.usage?.model,
              prompt,
            },
          });
          await loadCloudDrafts();
          showToast("Saved to drafts (cloud)", "ok");
        } catch {
          showToast("Could not auto-save draft", "warn");
        }
      }
    } catch (e: unknown) {
      if (isUnifiedAPIError(e)) {
        if (e.status === 0) {
          showToast(e.message, "warn");
          return;
        }
        if (e.status === 402 && e.code === "LIMIT_REACHED") {
          setUpgradePromptType("generation_limit");
          setShowUpgradePrompt(true);
          return;
        }
        if (e.status === 402) {
          setUpgradePromptType("credits");
          setShowUpgradePrompt(true);
          showToast(e.message || "Insufficient credits", "warn");
          return;
        }
        showToast(e.message, "error");
        return;
      }
      if (isLikelyNetworkError(e)) {
        showToast("Network error — check your connection.", "error");
        return;
      }
      showToast(
        e instanceof Error ? e.message : "Generation failed",
        "error",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAsDraft = async () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    const caption = last?.content ?? "";
    if (!caption.trim()) {
      showToast("Nothing to save yet — chat with the AI first.", "warn");
      return;
    }
    try {
      await UNIFIED_API.drafts.create({
        content: caption.slice(0, 32000),
        platform: "Multi",
        metadata: { source: "chat_export" },
      });
      try {
        await fetch("/api/unified/user/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete_mission_step",
            missionKey: "draft_three",
            delta: 1,
          }),
        });
      } catch {
        /* optional */
      }
      await loadProgress();
      await loadCloudDrafts();
      showToast("Draft saved to cloud ✓");
    } catch {
      const id = uid();
      const at = new Date().toISOString();
      const row: DraftRow = {
        id,
        caption: caption.slice(0, 4000),
        platform: "Multi",
        at,
        source: "local",
      };
      setDrafts((d) => [row, ...d]);
      try {
        const raw = localStorage.getItem(LOCAL_DRAFTS_KEY);
        const arr: Array<{
          id: string;
          caption: string;
          platform?: string;
          at?: string;
        }> = raw ? (JSON.parse(raw) as typeof arr) : [];
        localStorage.setItem(
          LOCAL_DRAFTS_KEY,
          JSON.stringify([
            { id, caption: row.caption, platform: "Multi", at },
            ...arr,
          ]),
        );
      } catch {
        /* ignore */
      }
      showToast("Saved locally (cloud unavailable)", "warn");
    }
  };

  const removeDraft = async (row: DraftRow) => {
    if (row.source === "local") {
      setDrafts((d) => d.filter((x) => x.id !== row.id));
      try {
        const raw = localStorage.getItem(LOCAL_DRAFTS_KEY);
        if (raw) {
          const arr = JSON.parse(raw) as Array<{ id: string }>;
          localStorage.setItem(
            LOCAL_DRAFTS_KEY,
            JSON.stringify(arr.filter((x) => x.id !== row.id)),
          );
        }
      } catch {
        /* ignore */
      }
      showToast("Removed");
      return;
    }
    try {
      await UNIFIED_API.drafts.delete(row.id);
      await loadCloudDrafts();
      await loadProgress();
      showToast("Deleted");
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const saveCloudSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await UNIFIED_API.settings.save(userSettings);
      if (res.settings) setUserSettings(res.settings);
      showToast("Preferences saved", "ok");
    } catch (err: unknown) {
      if (isLikelyNetworkError(err)) {
        showToast("Network error — preferences not saved.", "error");
      } else {
        showToast("Could not save preferences", "error");
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/unified/upload", { method: "POST", body: fd });
    if (!res.ok) {
      showToast("Upload failed", "error");
      return;
    }
    showToast("Image uploaded — ready for publishing flow.");
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Scheduled (simulated) — Meta API in Phase 3.");
    setPublishCaption("");
  };

  const onPickPlan = async (tier: "FREE" | "PRO" | "ENTERPRISE") => {
    if (tier === "FREE") {
      setShowPricing(false);
      return;
    }
    const planId = tier === "PRO" ? "pro" : "enterprise";
    try {
      showToast("Opening Stripe checkout…", "ok");
      await UNIFIED_API.checkout.createSession(planId);
    } catch (e: unknown) {
      if (isUnifiedAPIError(e) && e.status === 0) {
        showToast(e.message, "error");
        return;
      }
      showToast(e instanceof Error ? e.message : "Checkout failed", "error");
    }
  };

  const referralUrl =
    typeof window !== "undefined" && progress?.referralCode
      ? `${window.location.origin}/unified?ref=${progress.referralCode}`
      : "";

  return (
    <>
      <div className="ucs-bg-mesh" aria-hidden />
      <main className="ucs-main">
        <header className="ucs-topbar">
          <div className="ucs-brand">
            <div className="ucs-logo">UC</div>
            <div>
              <div className="ucs-title">Unified Studio</div>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>
                Signed in as {userEmail || "you"}{" "}
                <Link href="/dashboard" style={{ color: "#fda4af" }}>
                  Postforge →
                </Link>
              </div>
            </div>
          </div>
          <div className="ucs-meta">
            <span
              className="ucs-pill"
              title={online ? "Connected" : "No network — drafts may stay local"}
              style={{ opacity: online ? 1 : 0.85 }}
            >
              {online ? "● Online" : "○ Offline"}
            </span>
            <span className="ucs-pill">💎 {progress?.profile.unifiedCredits ?? "—"} credits</span>
            <span className="ucs-pill">🔥 {progress?.profile.streakCount ?? 0} streak</span>
            <Link
              href="/unified/pricing"
              className="ucs-btn ucs-btn-ghost"
              style={{ fontSize: 12, padding: "0.4rem 0.75rem" }}
            >
              Pricing
            </Link>
            <button
              type="button"
              className="ucs-btn ucs-btn-ghost"
              style={{ fontSize: 12, padding: "0.4rem 0.75rem" }}
              onClick={() => setShowPricing(true)}
            >
              Plans (modal)
            </button>
          </div>
        </header>

        {loadErr && (
          <div className="ucs-toast error" style={{ position: "relative", marginBottom: 12 }}>
            {loadErr}
          </div>
        )}

        <nav className="ucs-tabs-desktop" aria-label="Primary">
          {(
            [
              ["home", "Home"],
              ["create", "Create"],
              ["drafts", "Drafts"],
              ["publish", "Publish"],
              ["stats", "Stats"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`ucs-tab${tab === id ? " on" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "home" && (
          <div className="ucs-grid ucs-grid-2 ucs-grid-3" style={{ alignItems: "start" }}>
            <div className="ucs-card" style={{ gridColumn: "span 2" }}>
              <p className="ucs-h2">Level & XP</p>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 22 }}>
                  {xpInfo.icon} {xpInfo.name}
                </span>
                <span style={{ color: "#a1a1aa", fontSize: 13 }}>
                  {progress?.profile.xpTotal ?? 0} XP
                </span>
              </div>
              <div className="ucs-progress-track" style={{ marginTop: 10 }}>
                <div
                  className="ucs-progress-fill"
                  style={{ width: `${Math.min(100, xpInfo.pct)}%` }}
                />
              </div>
            </div>

            <div className="ucs-card">
              <p className="ucs-h2">Tier</p>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {progress?.profile.subscriptionTier ?? "FREE"}
              </div>
              <button
                type="button"
                className="ucs-btn ucs-btn-primary"
                style={{ width: "100%", marginTop: 12 }}
                onClick={() => setShowPricing(true)}
              >
                Upgrade
              </button>
            </div>

            <div className="ucs-card" style={{ gridColumn: "1 / -1" }}>
              <p className="ucs-h2">Your level path</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {LEVELS.map((l, i) => {
                  const xp = progress?.profile.xpTotal ?? 0;
                  const unlocked = xp >= l.min;
                  const span =
                    l.max === Number.POSITIVE_INFINITY ? 1 : l.max - l.min;
                  const pct =
                    l.max === Number.POSITIVE_INFINITY
                      ? 100
                      : Math.min(
                          100,
                          Math.max(
                            0,
                            ((xp - l.min) / (span || 1)) * 100,
                          ),
                        );
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom:
                          i < LEVELS.length - 1
                            ? "1px solid rgba(255,255,255,0.06)"
                            : "none",
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{l.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          <span>{l.name}</span>
                          <span style={{ color: unlocked ? "#86efac" : "#71717a" }}>
                            {unlocked ? "✅ Unlocked" : "🔒"}
                          </span>
                        </div>
                        <div
                          className="ucs-progress-track"
                          style={{ marginTop: 6, height: 4 }}
                        >
                          <div
                            className="ucs-progress-fill"
                            style={{
                              width: `${unlocked ? pct : 0}%`,
                              opacity: unlocked ? 1 : 0.35,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ucs-card" style={{ gridColumn: "1 / -1" }}>
              <p className="ucs-h2">Missions</p>
              <div style={{ display: "grid", gap: 10 }}>
                {(progress?.missions ?? []).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(0,0,0,0.25)",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 4 }}>
                      {m.description}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: m.status === "COMPLETED" ? "#86efac" : "#e4e4e7",
                      }}
                    >
                      {m.status === "COMPLETED"
                        ? "Completed"
                        : `Progress ${m.progress}/${m.target} · +${m.xpReward} XP`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ucs-card" style={{ gridColumn: "1 / -1" }}>
              <p className="ucs-h2">Referrals</p>
              <p style={{ fontSize: 13, color: "#a1a1aa", marginTop: 0 }}>
                Share your link. Rewards accrue when referrals convert (Phase 3).
              </p>
              {progress?.referralCode ? (
                <>
                  <div
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 13,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      wordBreak: "break-all",
                    }}
                  >
                    {referralUrl || progress.referralCode}
                  </div>
                  <button
                    type="button"
                    className="ucs-btn ucs-btn-ghost"
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      if (referralUrl) {
                        void navigator.clipboard.writeText(referralUrl);
                        showToast("Link copied");
                      }
                    }}
                  >
                    Copy link
                  </button>
                </>
              ) : (
                <span style={{ color: "#71717a" }}>Loading code…</span>
              )}
            </div>
          </div>
        )}

        {tab === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ucs-card">
              <p className="ucs-h2">One-shot generate</p>
              <p style={{ fontSize: 13, color: "#a1a1aa", marginTop: 0 }}>
                Uses <code style={{ fontSize: 12 }}>/api/unified/generate</code>{" "}
                (structured prompt). Chat below still uses{" "}
                <code style={{ fontSize: 12 }}>/api/unified/chat</code>.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <label style={{ fontSize: 12, color: "#a1a1aa" }}>
                  Platform
                  <select
                    className="ucs-input"
                    style={{ width: "100%", marginTop: 4 }}
                    value={genPlatform}
                    onChange={(e) => setGenPlatform(e.target.value)}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </label>
                <label style={{ fontSize: 12, color: "#a1a1aa" }}>
                  Content type
                  <select
                    className="ucs-input"
                    style={{ width: "100%", marginTop: 4 }}
                    value={genContentType}
                    onChange={(e) => setGenContentType(e.target.value)}
                  >
                    <option value="post">Post</option>
                    <option value="thread">Thread</option>
                    <option value="caption">Caption</option>
                    <option value="hook">Hook</option>
                  </select>
                </label>
              </div>
              <textarea
                className="ucs-textarea"
                placeholder="Describe what you want (tone, topic, CTA)…"
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                style={{ minHeight: 100 }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="ucs-btn ucs-btn-primary"
                  disabled={isGenerating}
                  onClick={() => void handleGenerateContent()}
                >
                  {isGenerating ? "Generating…" : "Generate"}
                </button>
              </div>
              {genOutput ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {genOutput}
                </div>
              ) : null}
            </div>

            <div className="ucs-card">
              <p className="ucs-h2">Preferences (cloud)</p>
              <p style={{ fontSize: 12, color: "#71717a", marginTop: 0 }}>
                Loaded on open; saved as analytics events on the server.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <label style={{ fontSize: 12, color: "#a1a1aa" }}>
                  Tone
                  <input
                    className="ucs-input"
                    style={{ width: "100%", marginTop: 4 }}
                    value={String(userSettings.tone ?? "professional")}
                    onChange={(e) =>
                      setUserSettings((s) => ({ ...s, tone: e.target.value }))
                    }
                  />
                </label>
                <label style={{ fontSize: 12, color: "#a1a1aa" }}>
                  Max length
                  <input
                    type="number"
                    className="ucs-input"
                    style={{ width: "100%", marginTop: 4 }}
                    value={Number(userSettings.maxLength ?? 500)}
                    onChange={(e) =>
                      setUserSettings((s) => ({
                        ...s,
                        maxLength: Number(e.target.value) || 500,
                      }))
                    }
                  />
                </label>
                <label
                  style={{
                    fontSize: 12,
                    color: "#a1a1aa",
                    gridColumn: "1 / -1",
                  }}
                >
                  Language (one-shot generate)
                  <select
                    className="ucs-input"
                    style={{ width: "100%", marginTop: 4 }}
                    value={String(userSettings.language ?? "english")}
                    onChange={(e) =>
                      setUserSettings((s) => ({
                        ...s,
                        language: e.target.value,
                      }))
                    }
                  >
                    <option value="english">English</option>
                    <option value="spanish">Spanish</option>
                    <option value="french">French</option>
                    <option value="german">German</option>
                    <option value="chinese">Chinese</option>
                    <option value="japanese">Japanese</option>
                  </select>
                </label>
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                  fontSize: 13,
                  color: "#e4e4e7",
                }}
              >
                <input
                  type="checkbox"
                  checked={userSettings.autoSaveDrafts !== false}
                  onChange={(e) =>
                    setUserSettings((s) => ({
                      ...s,
                      autoSaveDrafts: e.target.checked,
                    }))
                  }
                />
                Auto-save generated posts to cloud drafts
              </label>
              <button
                type="button"
                className="ucs-btn ucs-btn-ghost"
                style={{ marginTop: 10 }}
                disabled={isSavingSettings}
                onClick={() => void saveCloudSettings()}
              >
                {isSavingSettings ? "Saving…" : "Save preferences"}
              </button>
            </div>

            <div className="ucs-card">
              <p className="ucs-h2">Conversational AI</p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  maxHeight: "min(62vh, 520px)",
                  overflowY: "auto",
                  marginBottom: 12,
                }}
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`ucs-chat-msg ${m.role === "user" ? "user" : "assistant"}`}
                  >
                    {m.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  className="ucs-textarea"
                  placeholder="Ask for a LinkedIn thread, X hook, or IG caption…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendChat();
                    }
                  }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    className="ucs-btn ucs-btn-primary"
                    disabled={chatLoading}
                    onClick={() => void sendChat()}
                  >
                    {chatLoading ? "Thinking…" : "Send"}
                  </button>
                  <button
                    type="button"
                    className="ucs-btn ucs-btn-ghost"
                    onClick={() => void saveAsDraft()}
                  >
                    Save reply as draft
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "drafts" && (
          <div className="ucs-grid" style={{ gap: 12 }}>
            <div className="ucs-card" style={{ padding: "10px 14px" }}>
              <span style={{ fontSize: 12, color: "#a1a1aa" }}>
                {isSyncingDrafts
                  ? "Syncing drafts…"
                  : "Cloud drafts load from the API; unsynced local copies stay until you remove them."}
              </span>
            </div>
            {drafts.length === 0 ? (
              <div className="ucs-card">
                <p style={{ margin: 0, color: "#a1a1aa" }}>
                  No drafts yet — generate or save from the Create tab.
                </p>
              </div>
            ) : (
              drafts.map((d) => (
                <div key={d.id} className="ucs-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                      {d.platform} · {d.source === "cloud" ? "☁️" : "📁"}{" "}
                      {d.source} · {new Date(d.at).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="ucs-btn ucs-btn-danger"
                      style={{ padding: "0.35rem 0.6rem", fontSize: 12 }}
                      onClick={() => void removeDraft(d)}
                    >
                      Remove
                    </button>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>
                    {d.caption}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "publish" && (
          <div className="ucs-grid ucs-grid-2">
            <form className="ucs-card" onSubmit={handlePublishSubmit}>
              <p className="ucs-h2">Schedule (simulated)</p>
              <label className="ucs-sr-only" htmlFor="plat">
                Platform
              </label>
              <select
                id="plat"
                className="ucs-input"
                style={{ marginBottom: 10 }}
                value={publishPlatform}
                onChange={(e) => setPublishPlatform(e.target.value)}
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="x">X</option>
              </select>
              <textarea
                className="ucs-textarea"
                placeholder="Caption to publish"
                value={publishCaption}
                onChange={(e) => setPublishCaption(e.target.value)}
                style={{ minHeight: 100 }}
              />
              <button
                type="submit"
                className="ucs-btn ucs-btn-primary"
                style={{ width: "100%", marginTop: 10 }}
              >
                Approve & schedule
              </button>
            </form>
            <div className="ucs-card">
              <p className="ucs-h2">Media</p>
              <p style={{ fontSize: 13, color: "#a1a1aa" }}>
                Uploads attach to your studio profile (see DB asset row).
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="ucs-input"
                style={{ padding: 8, marginTop: 8 }}
                onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        )}

        {tab === "stats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {isLoadingAnalytics && (
              <div className="ucs-card">
                <p style={{ margin: 0, color: "#a1a1aa" }}>Loading analytics…</p>
              </div>
            )}
            {!isLoadingAnalytics && analyticsData && (
              <>
                <div className="ucs-grid ucs-grid-3">
                  <div className="ucs-card">
                    <p className="ucs-h2">Events (30d)</p>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>
                      {analyticsData.overview.totalEvents}
                    </div>
                    <p style={{ fontSize: 12, color: "#71717a", margin: 0 }}>
                      Analytics events recorded for your profile.
                    </p>
                  </div>
                  <div className="ucs-card">
                    <p className="ucs-h2">Drafts</p>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>
                      {analyticsData.overview.totalDrafts}
                    </div>
                    <p style={{ fontSize: 12, color: "#71717a", margin: 0 }}>
                      Published: {analyticsData.overview.publishedDrafts}
                    </p>
                  </div>
                  <div className="ucs-card">
                    <p className="ucs-h2">Credits</p>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>
                      {analyticsData.overview.creditsRemaining}
                    </div>
                    <p style={{ fontSize: 12, color: "#71717a", margin: 0 }}>
                      Level {analyticsData.overview.currentLevel} ·{" "}
                      {analyticsData.overview.totalXP} XP
                    </p>
                  </div>
                </div>
                <div className="ucs-card" style={{ gridColumn: "1 / -1" }}>
                  <p className="ucs-h2">Last 7 days</p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 6,
                      height: 120,
                      marginTop: 12,
                    }}
                  >
                    {analyticsData.dailyActivity.map((day) => {
                      const max = Math.max(
                        1,
                        ...analyticsData.dailyActivity.map((x) => x.total),
                      );
                      const h = Math.round((day.total / max) * 100);
                      return (
                        <div
                          key={day.date}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: `${h}%`,
                              minHeight: day.total ? 8 : 2,
                              borderRadius: 6,
                              background:
                                "linear-gradient(180deg, #6366f1, #a855f7)",
                              opacity: day.total ? 1 : 0.25,
                            }}
                            title={`${day.date}: ${day.total}`}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              color: "#71717a",
                              writingMode: "vertical-rl",
                              transform: "rotate(180deg)",
                            }}
                          >
                            {day.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="ucs-grid ucs-grid-2">
                  <div className="ucs-card">
                    <p className="ucs-h2">Events by type</p>
                    <ul
                      style={{
                        margin: "8px 0 0",
                        padding: 0,
                        listStyle: "none",
                        fontSize: 13,
                        color: "#d4d4d8",
                      }}
                    >
                      {Object.entries(analyticsData.statsByType)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 12)
                        .map(([name, count]) => (
                          <li
                            key={name}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "4px 0",
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <span style={{ fontFamily: "ui-monospace, monospace" }}>
                              {name}
                            </span>
                            <span>{count}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="ucs-card">
                    <p className="ucs-h2">Recent activity</p>
                    <ul
                      style={{
                        margin: "8px 0 0",
                        padding: 0,
                        listStyle: "none",
                        fontSize: 12,
                        color: "#a1a1aa",
                        maxHeight: 220,
                        overflowY: "auto",
                      }}
                    >
                      {analyticsData.recentActivity.map((ev) => (
                        <li
                          key={ev.id}
                          style={{
                            padding: "6px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <span style={{ color: "#e4e4e7", fontWeight: 600 }}>
                            {ev.eventName}
                          </span>
                          <span style={{ marginLeft: 8 }}>
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
            {!isLoadingAnalytics && !analyticsData && (
              <div className="ucs-card">
                <p style={{ margin: 0, color: "#a1a1aa" }}>
                  Could not load analytics. Try again from the Stats tab.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer
        style={{
          padding: "20px 16px 28px",
          textAlign: "center",
          fontSize: 12,
          color: "#71717a",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p style={{ margin: 0 }}>
          © {new Date().getFullYear()} Unified Content Studio. All rights reserved.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 11 }}>
          Powered by AI · Secure checkout via Stripe
        </p>
      </footer>

      <nav className="ucs-mobile-nav" aria-label="Mobile primary">
        {(
          [
            ["home", "🏠", "Home"],
            ["create", "✨", "Create"],
            ["drafts", "📝", "Drafts"],
            ["publish", "🚀", "Publish"],
            ["stats", "📊", "Stats"],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            className={`ucs-mni${tab === id ? " on" : ""}`}
            onClick={() => setTab(id)}
          >
            <span className="ucs-mni-ico">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="ucs-toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`ucs-toast${t.type === "error" ? " error" : ""}${t.type === "warn" ? " warn" : ""}`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {showUpgradePrompt && (
        <UpgradePrompt
          type={upgradePromptType}
          onDismiss={() => setShowUpgradePrompt(false)}
        />
      )}

      <PricingModal
        open={showPricing}
        onClose={() => setShowPricing(false)}
        currentTier={progress?.profile.subscriptionTier ?? "FREE"}
        onPick={onPickPlan}
      />
    </>
  );
}
