"use client";

import { useMemo, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { Conversation } from "@/lib/types";

export function SearchOverlay({
  open,
  onClose,
  conversations,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, dialogRef, onClose);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return conversations.slice(0, 8);
    return conversations
      .filter((c) => {
        if (c.title.toLowerCase().includes(s)) return true;
        return c.messages.some((m) => m.content.toLowerCase().includes(s));
      })
      .slice(0, 12);
  }, [conversations, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
        role="dialog"
        aria-modal="true"
        aria-label="Search conversations"
      >
        <div className="border-b border-zinc-900 p-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-cyan-500/40"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-600">Tip: press Esc to close</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-zinc-200 ring-1 ring-zinc-800 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
        </div>
        <div className="max-h-[50vh] overflow-auto p-2">
          {results.length ? (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900/70"
                onClick={() => {
                  onPick(c.id);
                  onClose();
                }}
              >
                <span className="truncate">{c.title}</span>
                <span className="shrink-0 text-[11px] text-zinc-600">
                  {new Date(c.updatedAt).toLocaleString()}
                </span>
              </button>
            ))
          ) : (
            <div className="p-4 text-sm text-zinc-500">No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}
