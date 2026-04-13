"use client";

import { useState } from "react";
import type { CommunityPost } from "@/lib/community";

export function PostCard({
  post,
  onComment,
}: {
  post: CommunityPost;
  onComment: (postId: string, body: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{post.title}</div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{post.body}</div>
        </div>
        <div className="shrink-0 text-[11px] text-zinc-600">
          resonance {Math.round(post.resonance)}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {post.comments.map((c) => (
          <div
            key={c.id}
            className="rounded-xl bg-zinc-900/40 px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800"
          >
            <div className="text-[11px] text-zinc-500">
              {c.author}
              {c.sentiment ? (
                <span className="ml-2 text-zinc-600">· {c.sentiment}</span>
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
            onClick={() => setOpen(true)}
          >
            Add comment
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            />
            <button
              type="button"
              className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950"
              onClick={() => {
                const t = draft.trim();
                if (!t) return;
                onComment(post.id, t);
                setDraft("");
                setOpen(false);
              }}
            >
              Post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
