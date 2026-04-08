"use client";

import { useState, type FormEvent } from "react";
import type { Prisma } from "@prisma/client";
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

export default function DashboardClient({ initialData }: DashboardClientProps) {
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [drafts] = useState(initialDrafts || []);
  const [isApproving, setIsApproving] = useState(false);

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
    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (res.status === 402) {
        setHitLimit("credits");
        setIsPaywallOpen(true);
      } else if (res.status === 202) {
        alert(
          "AI is generating your posts in the background! They will appear shortly.",
        );
        setTopic("");
      } else if (res.ok) {
        window.location.reload();
      } else {
        alert("Generation failed. Try again.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (drafts.length === 0) return;
    setIsApproving(true);

    try {
      const batchIds = [
        ...new Set(
          drafts
            .map((d) => d.batchId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      for (const id of batchIds) {
        const res = await fetch("/api/approve-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: id }),
        });
        if (!res.ok) {
          alert("Could not approve drafts.");
          return;
        }
      }
      window.location.reload();
    } catch {
      alert("Failed to approve.");
    } finally {
      setIsApproving(false);
    }
  };

  const simulateLimitHit = (limit: PlanLimitKey) => {
    setHitLimit(limit);
    setIsPaywallOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">PostForge</h1>
          <div className="flex items-center gap-6">
            <NotificationBell notifications={notifications || []} />
            <button
              type="button"
              onClick={() => simulateLimitHit("brands")}
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              + Add Brand
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* AI Credits */}
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

          {/* Plan Limits */}
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

          {/* Activation Status */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-3 h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
            <p className="text-lg font-semibold text-emerald-400">Active</p>
            <p className="mt-1 text-xs text-zinc-500">Dashboard Unlocked</p>
          </div>
        </div>

        {/* Main 2-Column Action Area */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-stretch">
          {/* Generate Content (Left - 3 cols) */}
          <div className="flex min-h-[280px] flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6 lg:col-span-3">
            <h2 className="mb-4 text-lg font-semibold">Generate content (AI)</h2>
            <form
              onSubmit={handleGenerate}
              className="flex min-h-0 flex-1 flex-col"
            >
              <textarea
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic (e.g., 'Benefits of remote work')"
                className="mb-4 min-h-[120px] w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 p-4 text-white transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="submit"
                disabled={isGenerating}
                className="h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:bg-zinc-700"
              >
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            </form>
          </div>

          {/* Drafts (Right - 2 cols) */}
          <div className="flex min-h-[280px] flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">
              Drafts ({drafts.length})
            </h2>

            {drafts.length === 0 ? (
              <div className="flex flex-grow items-center justify-center py-10 text-center text-sm text-zinc-600">
                Generate a topic to create drafts.
              </div>
            ) : (
              <div className="mb-4 max-h-64 flex-grow space-y-3 overflow-y-auto">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="rounded-xl border border-zinc-700/50 bg-zinc-800/60 p-3"
                  >
                    <p className="line-clamp-3 text-sm text-zinc-200">
                      {draft.caption}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {drafts.length > 0 && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving}
                className="mt-auto h-11 w-full rounded-xl bg-blue-600 font-medium text-white transition-colors hover:bg-blue-500 disabled:bg-zinc-700"
              >
                {isApproving ? "Scheduling..." : "Approve & Schedule All"}
              </button>
            )}
          </div>
        </div>

        {/* Scheduled Posts (Full Width Bottom) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-lg font-semibold">
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
        </div>
      </div>

      {/* Modals */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        limitHit={hitLimit}
      />
    </div>
  );
}
