"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { Prisma } from "@prisma/client";
import DraftReviewModal from "./draft-review-modal";
import NotificationBell from "./notification-bell";
import PaywallModal from "./paywall-modal";
import type { PlanLimitKey } from "@/lib/constants";
import { PLAN_LIMITS } from "@/lib/constants";

export type DashboardInitialData = {
  scheduledPosts: Prisma.ScheduledPostGetPayload<Record<string, never>>[];
  suggestedDrafts: Prisma.DraftGetPayload<Record<string, never>>[];
  notifications: Prisma.NotificationGetPayload<Record<string, never>>[];
  brandCount: number;
  aiCredits: number;
  maxCredits: number;
  maxBrands: number;
};

interface DashboardClientProps {
  initialData: DashboardInitialData;
}

const PLATFORM_OPTIONS = [
  { id: "LINKEDIN" as const, label: "LinkedIn" },
  { id: "X" as const, label: "X / Twitter" },
  { id: "INSTAGRAM" as const, label: "Instagram" },
];

type PlatformId = (typeof PLATFORM_OPTIONS)[number]["id"];

function platformLabel(p: string | null | undefined): string {
  const u = (p ?? "").toUpperCase();
  if (u === "LINKEDIN" || u.includes("LINKED")) return "LinkedIn";
  if (u === "X" || u === "TWITTER") return "X";
  if (u === "INSTAGRAM") return "Instagram";
  return p || "Draft";
}

function platformBadgeClass(p: string | null | undefined): string {
  const u = (p ?? "").toUpperCase();
  if (u === "LINKEDIN" || u.includes("LINKED"))
    return "border-blue-500/40 bg-blue-600/15 text-blue-200";
  if (u === "X" || u === "TWITTER")
    return "border-zinc-500/50 bg-zinc-800 text-zinc-200";
  if (u === "INSTAGRAM")
    return "border-pink-500/40 bg-pink-600/15 text-pink-200";
  return "border-zinc-600 bg-zinc-800 text-zinc-300";
}

type ModalBusy = "none" | "approve" | "reject" | "regenerate";

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const posts = initialData.scheduledPosts;
  const notifications = initialData.notifications;
  const aiCredits = initialData.aiCredits ?? 0;
  const rawMaxCredits = initialData.maxCredits;
  const brandsUsedCount = initialData.brandCount ?? 0;
  const rawMaxBrands = initialData.maxBrands;
  const initialDrafts = initialData.suggestedDrafts;
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [hitLimit, setHitLimit] = useState<PlanLimitKey>("brands");
  const [topic, setTopic] = useState("");
  const [postCount, setPostCount] = useState(3);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformId>>(
    () => new Set(["LINKEDIN", "X", "INSTAGRAM"]),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [drafts, setDrafts] = useState(initialDrafts || []);
  const [modalDraftId, setModalDraftId] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState<ModalBusy>("none");
  /** Prevents double-submit on list Regenerate; avoids 404 when first request already replaced the draft. */
  const [regeneratingDraftId, setRegeneratingDraftId] = useState<string | null>(
    null,
  );
  const regenerateLockedRef = useRef(false);

  const modalDraft = useMemo(
    () => drafts.find((d) => d.id === modalDraftId) ?? null,
    [drafts, modalDraftId],
  );

  const openModal = useCallback((draftId: string) => {
    setModalDraftId(draftId);
  }, []);

  const closeModal = useCallback(() => {
    setModalDraftId(null);
    setModalBusy("none");
  }, []);

  const togglePlatform = (id: PlatformId) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const limits = PLAN_LIMITS.FREE;
  const maxCredits = rawMaxCredits ?? 5000;
  const brandsUsed = brandsUsedCount;
  const maxBrands = rawMaxBrands ?? 1;
  const creditsUsed = maxCredits - aiCredits;
  const creditPercentage =
    maxCredits > 0 ? (creditsUsed / maxCredits) * 100 : 0;

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!topic.trim()) return;
    if (selectedPlatforms.size === 0) return;
    setIsGenerating(true);

    try {
      const platforms = Array.from(selectedPlatforms);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          postCount,
          platforms,
        }),
      });

      if (res.status === 402) {
        setHitLimit("credits");
        setIsPaywallOpen(true);
      } else if (res.ok) {
        const data = (await res.json()) as {
          drafts?: Prisma.DraftGetPayload<Record<string, never>>[];
        };
        if (Array.isArray(data.drafts) && data.drafts.length > 0) {
          setDrafts((prev) => {
            const ids = new Set(data.drafts!.map((d) => d.id));
            const rest = prev.filter((d) => !ids.has(d.id));
            return [...data.drafts!, ...rest];
          });
        } else {
          router.refresh();
        }
        setTopic("");
      } else {
        console.error("Generation failed");
      }
    } catch {
      console.error("Network error");
    } finally {
      setIsGenerating(false);
    }
  };

  const approveDraft = async (draftId: string, fromModal: boolean) => {
    if (fromModal) setModalBusy("approve");
    try {
      const res = await fetch("/api/approve-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action: "approve" }),
      });
      if (res.status === 402) {
        setHitLimit("credits");
        setIsPaywallOpen(true);
        return;
      }
      if (!res.ok) {
        console.error("Approve failed");
        return;
      }
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      if (fromModal) closeModal();
      router.refresh();
    } finally {
      if (fromModal) setModalBusy("none");
    }
  };

  const rejectDraft = async (draftId: string, fromModal: boolean) => {
    if (fromModal) setModalBusy("reject");
    try {
      const res = await fetch("/api/approve-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action: "reject" }),
      });
      if (!res.ok) {
        console.error("Reject failed");
        return;
      }
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      if (fromModal) closeModal();
      router.refresh();
    } finally {
      if (fromModal) setModalBusy("none");
    }
  };

  const regenerateDraft = async (draftId: string, fromModal: boolean) => {
    if (regenerateLockedRef.current) return;
    regenerateLockedRef.current = true;
    setRegeneratingDraftId(draftId);
    if (fromModal) setModalBusy("regenerate");
    try {
      const res = await fetch("/api/regenerate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      if (res.status === 402) {
        setHitLimit("credits");
        setIsPaywallOpen(true);
        return;
      }
      if (res.status === 404) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
        router.refresh();
        return;
      }
      if (!res.ok) {
        console.error("Regenerate failed", res.status);
        return;
      }
      if (fromModal) closeModal();
      router.refresh();
    } finally {
      regenerateLockedRef.current = false;
      setRegeneratingDraftId(null);
      if (fromModal) setModalBusy("none");
    }
  };

  const simulateLimitHit = (limit: PlanLimitKey) => {
    setHitLimit(limit);
    setIsPaywallOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 shadow-lg shadow-black/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 text-sm font-black text-zinc-950 shadow-md shadow-emerald-500/25">
              PF
            </span>
            PostForge
          </Link>
          <nav
            className="flex flex-wrap items-center justify-center gap-1 text-sm font-medium sm:gap-2"
            aria-label="Main"
          >
            <Link
              href="/dashboard"
              className={`rounded-lg px-3 py-2 transition-colors ${
                pathname === "/dashboard"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/80 hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/history"
              className={`rounded-lg px-3 py-2 transition-colors ${
                pathname.startsWith("/dashboard/history")
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/80 hover:text-white"
              }`}
            >
              History
            </Link>
            <Link
              href="/dashboard/settings"
              className={`rounded-lg px-3 py-2 transition-colors ${
                pathname.startsWith("/dashboard/settings")
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/80 hover:text-white"
              }`}
            >
              Settings
            </Link>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="hidden items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-sm sm:flex"
              title="AI credits"
            >
              <span aria-hidden>💎</span>
              <span className="font-semibold text-emerald-300">
                {aiCredits.toLocaleString()}
              </span>
              <span className="text-zinc-500">credits</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/90 px-2.5 py-1.5 text-sm sm:hidden">
              <span aria-hidden>💎</span>
              <span className="font-semibold text-emerald-300">
                {aiCredits.toLocaleString()}
              </span>
            </div>
            <NotificationBell notifications={notifications || []} />
            <button
              type="button"
              onClick={() => simulateLimitHit("brands")}
              className="hidden text-sm font-medium text-zinc-400 transition-colors hover:text-white sm:inline"
            >
              + Add Brand
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section
          className="mb-14 text-center"
          aria-labelledby="hero-heading"
        >
          <h1
            id="hero-heading"
            className="mb-4 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl"
          >
            Ship social content on autopilot
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-zinc-400">
            Generate platform-aware drafts, refine in one place, and schedule
            when you are ready — without losing your voice.
          </p>
          <a
            href="#generateForm"
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_24px_-4px_rgba(16,185,129,0.55)] transition-transform hover:bg-emerald-500 active:scale-[0.98]"
          >
            Create posts
          </a>
        </section>

        {/* Stats Grid */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="mb-3 text-sm font-medium text-zinc-400">AI Credits</p>
            <p className="mb-4 text-4xl font-bold text-emerald-400">
              {aiCredits.toLocaleString()}
            </p>
            <div className="h-2 w-full rounded-full bg-zinc-800">
              <div
                className={`h-2 rounded-full transition-all ${creditPercentage > 80 ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(creditPercentage, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {creditsUsed.toLocaleString()} of {maxCredits.toLocaleString()}{" "}
              used
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="mb-4 text-sm font-medium text-zinc-400">
              Plan Limits (Free)
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Brands</span>
                <span
                  className={`font-medium ${brandsUsed >= maxBrands ? "text-red-400" : "text-white"}`}
                >
                  {brandsUsed} / {maxBrands}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Seats</span>
                <span className="font-medium text-white">
                  1 / {limits.seats}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Monthly AI Runs</span>
                <span className="font-medium text-white">
                  0 / {limits.monthlyAiRuns}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-3 h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
            <p className="text-lg font-semibold text-emerald-400">Active</p>
            <p className="mt-1 text-xs text-zinc-500">Dashboard Unlocked</p>
          </div>
        </div>

        <section
          id="generateForm"
          className="mb-12 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8"
          aria-labelledby="generate-heading"
        >
          <h2
            id="generate-heading"
            className="mb-6 text-xl font-semibold sm:text-2xl"
          >
            Generate content
          </h2>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label
                htmlFor="topic"
                className="mb-2 block text-sm font-medium text-zinc-400"
              >
                Topic
              </label>
              <textarea
                id="topic"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What should we write about? e.g. remote work culture in 2026"
                className="min-h-[120px] w-full resize-y rounded-xl border border-zinc-700 bg-zinc-800/80 p-4 text-white placeholder:text-zinc-500 focus:border-emerald-500/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-400">
                Platforms
              </p>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((p) => {
                  const on = selectedPlatforms.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        on
                          ? "border-emerald-500/60 bg-emerald-600/20 text-emerald-200 shadow-[0_0_12px_-2px_rgba(16,185,129,0.35)]"
                          : "border-zinc-600 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label
                  htmlFor="postCount"
                  className="text-sm font-medium text-zinc-400"
                >
                  Number of posts
                </label>
                <span className="tabular-nums text-sm font-semibold text-emerald-400">
                  {postCount}
                </span>
              </div>
              <input
                id="postCount"
                type="range"
                min={1}
                max={10}
                value={postCount}
                onChange={(e) => setPostCount(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-emerald-500"
              />
              <div className="mt-1 flex justify-between text-xs text-zinc-500">
                <span>1</span>
                <span>10</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || selectedPlatforms.size === 0}
              className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 text-base font-semibold text-white transition-colors hover:bg-emerald-500 disabled:bg-zinc-700"
            >
              {isGenerating && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
              )}
              {isGenerating ? "Generating…" : "Generate"}
            </button>
          </form>
        </section>

        <section className="mb-12" aria-labelledby="drafts-heading">
          <h2
            id="drafts-heading"
            className="mb-6 text-xl font-semibold sm:text-2xl"
          >
            Drafts awaiting approval ({drafts.length})
          </h2>

          {drafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 py-16 text-center text-zinc-500">
              No drafts yet. Add a topic above to generate your first batch.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
              {drafts.map((draft) => {
                const pillar = draft.pillar?.trim() || "General";
                return (
                  <article
                    key={draft.id}
                    className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/5"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${platformBadgeClass(draft.platform)}`}
                      >
                        {platformLabel(draft.platform)}
                      </span>
                      <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-200/90">
                        {pillar}
                      </span>
                    </div>
                    <p className="mb-4 line-clamp-3 flex-grow text-sm leading-relaxed text-zinc-300">
                      {draft.caption}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
                      <button
                        type="button"
                        onClick={() => void approveDraft(draft.id, false)}
                        className="flex-1 min-w-[100px] rounded-lg bg-emerald-600/90 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal(draft.id)}
                        className="flex-1 min-w-[100px] rounded-lg bg-blue-600/90 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void regenerateDraft(draft.id, false)}
                        disabled={regeneratingDraftId !== null}
                        className="flex-1 min-w-[100px] rounded-lg border border-orange-500/40 bg-orange-950/30 py-2 text-center text-xs font-semibold text-orange-200 transition-colors hover:bg-orange-950/50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {regeneratingDraftId === draft.id
                          ? "Regenerating…"
                          : "Regenerate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejectDraft(draft.id, false)}
                        className="flex-1 min-w-[100px] rounded-lg border border-red-500/40 bg-red-950/30 py-2 text-center text-xs font-semibold text-red-200 transition-colors hover:bg-red-950/50"
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8"
          aria-labelledby="scheduled-heading"
        >
          <h2
            id="scheduled-heading"
            className="mb-6 text-xl font-semibold sm:text-2xl"
          >
            Scheduled posts ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-600">
              No posts scheduled yet.
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-4"
                >
                  <p className="flex-grow text-sm text-zinc-200">
                    {post.caption}
                  </p>
                  <p className="whitespace-nowrap pt-0.5 font-mono text-xs text-zinc-500">
                    {new Date(post.scheduledAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    ,{" "}
                    {new Date(post.scheduledAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <DraftReviewModal
        draft={modalDraft}
        open={Boolean(modalDraftId && modalDraft)}
        onClose={closeModal}
        onCaptionSaved={(id, caption) => {
          setDrafts((prev) =>
            prev.map((d) => (d.id === id ? { ...d, caption } : d)),
          );
        }}
        onApprove={(id) => approveDraft(id, true)}
        onReject={(id) => rejectDraft(id, true)}
        onRegenerate={(id) => regenerateDraft(id, true)}
        busy={modalBusy}
      />

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        limitHit={hitLimit}
      />
    </div>
  );
}
