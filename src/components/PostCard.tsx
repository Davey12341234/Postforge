"use client";

import { useState } from "react";
import type { CommunityPost } from "@/lib/community";

function sentimentHint(s: NonNullable<CommunityPost["comments"][number]["sentiment"]>): string | null {
  if (s === "pos") return "encouraging";
  if (s === "neu") return null;
  return null;
}

export function PostCard({
  post,
  onComment,
  onAppreciate,
}: {
  post: CommunityPost;
  onComment: (postId: string, body: string) => Promise<string | undefined>;
  onAppreciate: (postId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [commentErr, setCommentErr] = useState<string | null>(null);
  const [busyApp, setBusyApp] = useState(false);

  const appreciated = post.viewerHasAppreciated ?? false;
  const count = post.appreciationCount ?? 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-zinc-100">{post.title}</div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{post.body}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-zinc-600">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-300/90" aria-hidden>
              ✦
            </span>
            <span className="font-medium text-zinc-300">{count}</span>
            <span className="text-zinc-600">appreciation{count === 1 ? "" : "s"}</span>
          </div>
          <div className="text-zinc-600">thread resonance {Math.round(post.resonance)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={appreciated || busyApp}
          onClick={() => {
            setBusyApp(true);
            void onAppreciate(post.id).finally(() => setBusyApp(false));
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
            appreciated
              ? "cursor-default bg-amber-950/50 text-amber-200/90 ring-amber-800/60"
              : "bg-zinc-900 text-amber-200/95 ring-zinc-700 hover:bg-amber-950/40 hover:ring-amber-800/50 disabled:opacity-50"
          }`}
        >
          {appreciated ? "You appreciated this" : "Appreciate"}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {post.comments.map((c) => (
          <div
            key={c.id}
            className="rounded-xl bg-zinc-900/40 px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800"
          >
            <div className="text-[11px] text-zinc-500">
              {c.author}
              {c.sentiment && sentimentHint(c.sentiment) ? (
                <span className="ml-2 text-zinc-600">· {sentimentHint(c.sentiment)}</span>
              ) : null}
            </div>
            <div className="mt-1">{c.body}</div>
            {c.ghostReply ? (
              <div className="mt-2 rounded-lg bg-zinc-950/60 p-2 text-xs text-zinc-500 ring-1 ring-zinc-800">
                Ghost: {c.ghostReply}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3">
        {!open ? (
          <button
            type="button"
            className="text-xs text-cyan-400 hover:text-cyan-300"
            onClick={() => {
              setCommentErr(null);
              setOpen(true);
            }}
          >
            Add supportive comment
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Something kind or constructive…"
                className="flex-1 rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              />
              <button
                type="button"
                className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950"
                onClick={() => {
                  void (async () => {
                    const t = draft.trim();
                    if (!t) return;
                    setCommentErr(null);
                    const err = await onComment(post.id, t);
                    if (err) {
                      setCommentErr(err);
                      return;
                    }
                    setDraft("");
                    setOpen(false);
                  })();
                }}
              >
                Post
              </button>
            </div>
            {commentErr ? (
              <p className="text-[11px] leading-relaxed text-amber-400/95">{commentErr}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
