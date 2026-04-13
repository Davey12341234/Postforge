"use client";

import type { HeartbeatSuggestion } from "@/lib/heartbeat";

export function ProactiveToast({
  items,
  onDismiss,
  onAsk,
}: {
  items: (HeartbeatSuggestion & { open: boolean })[];
  onDismiss: (id: string) => void;
  onAsk: (draft: string) => void;
}) {
  const visible = items.filter((i) => i.open);
  if (!visible.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(420px,92vw)] flex-col gap-2">
      {visible.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl ring-1 ring-white/5 backdrop-blur"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-zinc-200">{t.title}</div>
              <div className="mt-1 text-sm text-zinc-400">{t.body}</div>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              onClick={() => onDismiss(t.id)}
            >
              ×
            </button>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
              onClick={() => {
                const d = t.draft?.trim();
                if (d) onAsk(d);
              }}
            >
              Ask now
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
