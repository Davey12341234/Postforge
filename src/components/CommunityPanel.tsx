"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { getCommunityVisitorId } from "@/lib/community-visitor";
import { fetchChatWithRetry } from "@/lib/fetch-chat";
import type { CommunityPost } from "@/lib/community";
import { COMMUNITY_DEBATE_COST } from "@/lib/usage-cost";
import { PostCard } from "./PostCard";

function communityFetchHeaders(): HeadersInit {
  const vid = getCommunityVisitorId();
  const h: Record<string, string> = {};
  if (vid.length >= 8) h["X-Community-Visitor"] = vid;
  return h;
}

export function CommunityPanel({
  open,
  onClose,
  creditsBalance,
  onSpendCredits,
  serverCredits,
  onAfterServerDebate,
}: {
  open: boolean;
  onClose: () => void;
  creditsBalance: number;
  onSpendCredits: (amount: number) => boolean;
  /** When true, debate cost is debited on the server — skip local wallet deduction. */
  serverCredits?: boolean;
  /** Refresh parent wallet after a server-side debate debit. */
  onAfterServerDebate?: () => void | Promise<void>;
}) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [debateTopic, setDebateTopic] = useState("");
  const [debate, setDebate] = useState<{ for: string; against: string } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, panelRef, onClose);

  const refresh = useCallback(async () => {
    const res = await fetchChatWithRetry("/api/community", {
      method: "GET",
      headers: communityFetchHeaders(),
    });
    const data = (await res.json()) as { posts: CommunityPost[] };
    setPosts(data.posts ?? []);
  }, []);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- load posts when panel opens */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, refresh]);

  async function createPost() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    await fetchChatWithRetry("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...communityFetchHeaders() },
      body: JSON.stringify({ action: "post", title: t, body: b }),
    });
    setTitle("");
    setBody("");
    await refresh();
  }

  async function addComment(postId: string, text: string): Promise<string | undefined> {
    const res = await fetchChatWithRetry("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...communityFetchHeaders() },
      body: JSON.stringify({ action: "comment", postId, body: text, author: "you" }),
    });
    if (res.status === 422) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      return j.error ?? "Please keep comments constructive.";
    }
    if (!res.ok) return "Could not post comment.";
    await refresh();
    return undefined;
  }

  async function appreciate(postId: string) {
    const visitorKey = getCommunityVisitorId();
    if (visitorKey.length < 8) return;
    const res = await fetchChatWithRetry("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...communityFetchHeaders() },
      body: JSON.stringify({ action: "appreciate", postId, visitorKey }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { appreciationCount?: number; duplicate?: boolean };
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              appreciationCount: data.appreciationCount ?? p.appreciationCount,
              viewerHasAppreciated: true,
            }
          : p,
      ),
    );
    if (data.duplicate) await refresh();
  }

  const spotlight = useMemo(() => {
    const ranked = [...posts].sort((a, b) => {
      if (b.appreciationCount !== a.appreciationCount) return b.appreciationCount - a.appreciationCount;
      return b.createdAt - a.createdAt;
    });
    return ranked.slice(0, 5);
  }, [posts]);

  async function runDebate() {
    const topic = debateTopic.trim();
    if (!topic) return;
    if (creditsBalance < COMMUNITY_DEBATE_COST) {
      setDebate({
        for: `Not enough credits (debate costs ${COMMUNITY_DEBATE_COST}). Open Plans to review balance and tiers.`,
        against: "",
      });
      return;
    }
    const res = await fetchChatWithRetry("/api/community/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    const data = (await res.json()) as { for?: string; against?: string; error?: string };
    if (data.error) {
      setDebate({ for: `Error: ${data.error}`, against: "" });
      return;
    }
    if (!serverCredits) {
      if (!onSpendCredits(COMMUNITY_DEBATE_COST)) {
        setDebate({ for: "Could not deduct credits.", against: "" });
        return;
      }
    }
    setDebate({ for: data.for ?? "", against: data.against ?? "" });
    if (serverCredits && onAfterServerDebate) {
      void onAfterServerDebate();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="h-[min(92vh,860px)] w-full max-w-lg overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bbgpt-community-title"
      >
        <div className="sticky top-0 z-10 flex flex-col gap-1 border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div id="bbgpt-community-title" className="text-sm font-semibold text-zinc-100">
              Community
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            A shared board for everyone on this deployment. Rankings use{" "}
            <span className="text-zinc-400">appreciations</span> only — no downvotes. Comments stay
            constructive; harsh or insulting lines are gently blocked.
          </p>
        </div>

        <div className="space-y-4 p-4">
          {spotlight.length ? (
            <div className="rounded-2xl border border-amber-900/35 bg-amber-950/20 p-3 ring-1 ring-amber-900/25">
              <div className="text-xs font-semibold text-amber-100/95">Community spotlight</div>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                Posts with the most ✦ appreciations surface here for all visitors.
              </p>
              <ol className="mt-3 space-y-2">
                {spotlight.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-zinc-950/50 px-2.5 py-2 text-sm ring-1 ring-zinc-800/80"
                  >
                    <span className="min-w-0">
                      <span className="text-[11px] font-medium text-zinc-500">{i + 1}. </span>
                      <span className="text-zinc-200">{p.title}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-amber-200/90">
                      ✦ {p.appreciationCount ?? 0}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-medium text-zinc-300">AI debate</div>
            <input
              value={debateTopic}
              onChange={(e) => setDebateTopic(e.target.value)}
              placeholder="Topic…"
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            />
            <button
              type="button"
              onClick={() => void runDebate()}
              className="mt-2 rounded-xl bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
              title={`Costs ${COMMUNITY_DEBATE_COST} credits when successful`}
            >
              Run debate ({COMMUNITY_DEBATE_COST} cr)
            </button>
            {debate ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="rounded-xl bg-zinc-900/50 p-2 text-zinc-200 ring-1 ring-zinc-800">
                  <div className="text-[11px] text-emerald-400">FOR</div>
                  <div className="mt-1 whitespace-pre-wrap text-zinc-300">{debate.for}</div>
                </div>
                <div className="rounded-xl bg-zinc-900/50 p-2 text-zinc-200 ring-1 ring-zinc-800">
                  <div className="text-[11px] text-rose-400">AGAINST</div>
                  <div className="mt-1 whitespace-pre-wrap text-zinc-300">{debate.against}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-medium text-zinc-300">New post</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Body"
              rows={4}
              className="mt-2 w-full resize-none rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            />
            <button
              type="button"
              onClick={() => void createPost()}
              className="mt-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950"
            >
              Publish
            </button>
          </div>

          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onComment={addComment}
                onAppreciate={appreciate}
              />
            ))}
            {!posts.length ? (
              <div className="text-sm text-zinc-600">No posts yet — add one above.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
