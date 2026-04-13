"use client";

import { estimateSendCreditsBreakdown } from "@/lib/usage-cost";
import type { SendMode } from "@/lib/usage-cost";
import type { ModelTier } from "@/lib/types";

export function CostPreview({
  balance,
  model,
  thinking,
  mode,
}: {
  balance: number;
  model: ModelTier;
  thinking: boolean;
  mode: SendMode;
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
    <div className="mx-auto mb-2 w-full max-w-3xl rounded-2xl border border-zinc-800/90 bg-zinc-950/60 px-4 py-3 ring-1 ring-white/5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            This send
          </div>
          <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">{total} cr</div>
        </div>
        <div className="text-right text-[11px] text-zinc-500">
          Balance <span className="font-mono text-zinc-300">{balance}</span>
          {blocked ? (
            <span className="ml-2 text-rose-400">Not enough credits</span>
          ) : (
            <span className="ml-2 text-zinc-400">
              → <span className="font-mono text-emerald-300/90">{after}</span> left
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800/90">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <ul className="mt-2 space-y-0.5 text-[10px] text-zinc-500">
        {lines.map((row) => (
          <li key={row.label} className="flex justify-between gap-2">
            <span>{row.label}</span>
            <span className="font-mono text-zinc-400">+{row.credits}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-zinc-600">
        This is the in-app <span className="text-zinc-500">credit</span> cost for one successful reply. Stripe
        subscription pricing (USD/month) for your plan tier is in{" "}
        <span className="text-zinc-500">Plans</span> — separate from per-message credits.
      </p>
    </div>
  );
}
