"use client";

import { CHAT_COLUMN_CLASS } from "@/lib/chat-layout";
import { estimateSendCreditsBreakdown } from "@/lib/usage-cost";
import type { SendMode } from "@/lib/usage-cost";
import type { ModelTier } from "@/lib/types";

export function CostPreview({
  balance,
  model,
  thinking,
  mode,
  contextHint,
}: {
  balance: number;
  model: ModelTier;
  thinking: boolean;
  mode: SendMode;
  /** Shown when pricing differs from header toggles (e.g. file attachments → Gemini chat). */
  contextHint?: string;
}) {
  const { lines, total } = estimateSendCreditsBreakdown({ model, thinking, mode });
  const after = Math.max(0, balance - total);
  const ratio = balance > 0 ? Math.min(1, after / balance) : 0;
  const low = balance > 0 && after / balance < 0.2;
  const blocked = balance < total;

  const barColor = blocked
    ? "bg-rose-500"
    : low
      ? "bg-amber-400"
      : "bg-gradient-to-r from-cyan-500 to-emerald-500";

  return (
    <div
      className={`mb-1.5 rounded-xl border border-zinc-800/90 bg-zinc-950/60 px-3 py-2 ring-1 ring-white/5 ${CHAT_COLUMN_CLASS}`}
    >
      {contextHint ? (
        <p className="mb-1 text-[10px] leading-snug text-cyan-500/95">{contextHint}</p>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">This send</span>
          <span className="font-mono text-base font-semibold text-zinc-100">{total} cr</span>
        </div>
        <div className="text-[10px] text-zinc-500">
          Bal <span className="font-mono text-zinc-300">{balance}</span>
          {blocked ? (
            <span className="ml-1.5 text-rose-400">Insufficient</span>
          ) : (
            <span className="ml-1.5 text-zinc-400">
              → <span className="font-mono text-emerald-300/90">{after}</span>
            </span>
          )}
        </div>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800/90">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <details className="mt-1.5 group">
        <summary className="cursor-pointer list-none text-[9px] text-zinc-600 marker:content-none [&::-webkit-details-marker]:hidden hover:text-zinc-400">
          <span className="underline decoration-zinc-700 underline-offset-2">Cost breakdown</span>
        </summary>
        <ul className="mt-1 space-y-0.5 text-[9px] text-zinc-500">
          {lines.map((row) => (
            <li key={row.label} className="flex justify-between gap-2">
              <span>{row.label}</span>
              <span className="font-mono text-zinc-400">+{row.credits}</span>
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-1 hidden text-[9px] leading-snug text-zinc-600 sm:block" title="USD subscription is separate">
        Per-reply credits differ from monthly subscription pricing (see Plans).
      </p>
    </div>
  );
}
