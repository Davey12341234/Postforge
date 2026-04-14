"use client";

import type { PlanDefinition } from "@/lib/plans";
import { POWER_TEMPLATES, planRank, type PowerTemplate } from "@/lib/instant-templates";

export function InstantTemplates({
  plan,
  onPick,
}: {
  plan: PlanDefinition;
  onPick: (t: PowerTemplate) => void;
}) {
  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="mb-3 text-sm font-medium text-zinc-200">Power templates</div>
      <p className="mb-3 text-xs text-zinc-500">
        One tap configures model, thinking, and quantum options — then focus on your prompt.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {POWER_TEMPLATES.map((t) => {
          const ok = planRank(plan.id) >= planRank(t.minPlan);
          return (
            <button
              key={t.id}
              type="button"
              title={
                !ok
                  ? `Requires ${t.minPlan}+ plan — click to open Plans`
                  : t.description
              }
              onClick={() => onPick(t)}
              className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                ok
                  ? "border-zinc-800 bg-zinc-900/50 text-zinc-200 ring-1 ring-transparent hover:border-cyan-500/30 hover:ring-cyan-500/20"
                  : "cursor-pointer border-zinc-800/50 bg-zinc-950/40 text-zinc-500 ring-1 ring-transparent hover:border-amber-500/25 hover:text-zinc-400"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-zinc-100">
                <span aria-hidden>{t.emoji}</span>
                {t.title}
                {!ok ? (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-normal uppercase text-zinc-500">
                    {t.minPlan}+
                  </span>
                ) : null}
              </span>
              <span className="mt-1 text-[11px] text-zinc-500">{t.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
