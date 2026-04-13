"use client";

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { fetchChatWithRetry } from "@/lib/fetch-chat";
import type { CommunityPost } from "@/lib/community";
import { COMMUNITY_DEBATE_COST } from "@/lib/usage-cost";
import { PostCard } from "./PostCard";

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

  async function refresh() {
    const res = await fetchChatWithRetry("/api/community", { method: "GET" });
    const data = (await res.json()) as { posts: CommunityPost[] };
    setPosts(data.posts ?? []);
  }

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- load posts when panel opens */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  async function createPost() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    await fetchChatWithRetry("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "post", title: t, body: b }),
    });
    setTitle("");
    setBody("");
    await refresh();
  }

  async function addComment(postId: string, text: string) {
    await fetchChatWithRetry("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", postId, body: text, author: "you" }),
    });
    await refresh();
  }

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
        aria-labelledby="babygpt-community-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur">
          <div id="babygpt-community-title" className="text-sm font-semibold text-zinc-100">
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

        <div className="space-y-4 p-4">
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
              <PostCard key={p.id} post={p} onComment={(id, t) => void addComment(id, t)} />
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
