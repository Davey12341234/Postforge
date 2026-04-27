"use client";

import type { PlanDefinition } from "@/lib/plans";
import { planAllowsModel } from "@/lib/plans";
import type { ModelTier } from "@/lib/types";
import { uiDiag } from "@/lib/ui-diagnostics";

export type QuantumFlags = {
  kolmogorov: boolean;
  holographic: boolean;
  dna: boolean;
  adiabatic: number;
};

const MODELS: ModelTier[] = [
  "glm-4-flash",
  "glm-4-air",
  "glm-4-plus",
  "glm-4-long",
  "glm-4",
];

export function QuantumControls({
  id,
  plan,
  model,
  onModel,
  thinking,
  onThinking,
  schrodinger,
  onSchrodinger,
  agentMode,
  onAgentMode,
  quantum,
  onQuantum,
  onRequestUpgrade,
}: {
  /** Anchor for scroll-into-view (e.g. welcome screen “jump to controls”). */
  id?: string;
  plan: PlanDefinition;
  model: ModelTier;
  onModel: (m: ModelTier) => void;
  thinking: boolean;
  onThinking: (v: boolean) => void;
  schrodinger: boolean;
  onSchrodinger: (v: boolean) => void;
  agentMode: boolean;
  onAgentMode: (v: boolean) => void;
  quantum: QuantumFlags;
  onQuantum: (next: QuantumFlags) => void;
  /** When a control is locked, open subscription / plans. */
  onRequestUpgrade: () => void;
}) {
  const canThinking = plan.features.thinking;
  const canAgent = plan.features.agent;
  const canSchrodinger = plan.features.schrodinger;
  const canK = plan.features.kolmogorov;
  const canH = plan.features.holographic;
  const canDna = plan.features.dna;

  return (
    <div id={id} className="flex min-w-max flex-wrap items-center gap-2 md:min-w-0">
      <label className="flex min-h-10 items-center gap-2 text-xs text-zinc-400">
        Model
        <select
          value={model}
          title={plan.modelHighlights[model]}
          onChange={(e) => {
            const v = e.target.value as ModelTier;
            if (!planAllowsModel(plan, v)) {
              uiDiag("header.model", "fail", { planId: plan.id, requested: v, reason: "not_on_plan" });
              onRequestUpgrade();
              return;
            }
            uiDiag("header.model", "ok", { planId: plan.id, model: v });
            onModel(v);
          }}
          className="max-w-[140px] min-h-10 rounded-lg bg-zinc-900 px-2 py-2 text-xs text-zinc-100 ring-1 ring-zinc-800"
        >
          {MODELS.map((m) => {
            const allowed = planAllowsModel(plan, m);
            return (
              <option key={m} value={m} disabled={!allowed}>
                {m}
                {!allowed ? " (plan)" : ""}
              </option>
            );
          })}
        </select>
      </label>

      <button
        type="button"
        title={
          canThinking
            ? "GLM (Z.AI): native extended-reasoning channel. OpenAI: appends a step-by-step system instruction (no separate reasoning stream)."
            : "Upgrade your plan to enable Thinking (click to open Plans)"
        }
        onClick={() => {
          if (!canThinking) {
            uiDiag("header.thinking", "skip", { planId: plan.id, reason: "needs_upgrade" });
            onRequestUpgrade();
            return;
          }
          const next = !thinking;
          uiDiag("header.thinking", "ok", { planId: plan.id, on: next });
          onThinking(next);
        }}
        className={`min-h-10 rounded-full px-3 py-2 text-xs ring-1 ${
          !canThinking
            ? "cursor-pointer opacity-60 hover:opacity-90"
            : thinking
              ? "bg-cyan-500/15 text-cyan-200 ring-cyan-500/30"
              : "bg-zinc-900 text-zinc-400 ring-zinc-800"
        }`}
      >
        Thinking
      </button>

      <button
        type="button"
        disabled={agentMode}
        title={
          !canSchrodinger
            ? "Two models (dual-stream) requires Pro or Team — click to open Plans"
            : agentMode
              ? "Turn off Agent first — then you can enable two-model dual-stream"
              : "Run two models in parallel; keep the stronger reply stream"
        }
        onClick={() => {
          if (agentMode) {
            uiDiag("header.schrodinger", "skip", { planId: plan.id, reason: "agent_blocks" });
            return;
          }
          if (!canSchrodinger) {
            uiDiag("header.schrodinger", "skip", { planId: plan.id, reason: "needs_upgrade" });
            onRequestUpgrade();
            return;
          }
          const next = !schrodinger;
          uiDiag("header.schrodinger", "ok", { planId: plan.id, on: next });
          onSchrodinger(next);
        }}
        className={`min-h-10 rounded-full px-3 py-2 text-xs ring-1 ${
          agentMode
            ? "cursor-not-allowed opacity-40"
            : !canSchrodinger
              ? "cursor-pointer opacity-60 hover:opacity-90"
              : schrodinger
                ? "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30"
                : "bg-zinc-900 text-zinc-400 ring-zinc-800"
        }`}
      >
        Two models
      </button>

      <button
        type="button"
        title={
          canAgent
            ? "Tool-using agent loop (web, calculator, …)"
            : "Upgrade to Starter or higher for Agent mode (click to open Plans)"
        }
        onClick={() => {
          if (!canAgent) {
            uiDiag("header.agent", "skip", { planId: plan.id, reason: "needs_upgrade" });
            onRequestUpgrade();
            return;
          }
          const next = !agentMode;
          uiDiag("header.agent", "ok", { planId: plan.id, on: next });
          onAgentMode(next);
          if (next) onSchrodinger(false);
        }}
        className={`min-h-10 rounded-full px-3 py-2 text-xs ring-1 ${
          !canAgent
            ? "cursor-pointer opacity-60 hover:opacity-90"
            : agentMode
              ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
              : "bg-zinc-900 text-zinc-400 ring-zinc-800"
        }`}
      >
        Agent
      </button>

      <details className="relative">
        <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-full bg-zinc-900 px-3 py-2 text-xs text-zinc-300 ring-1 ring-zinc-800">
          Quantum
        </summary>
        <div className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,320px)] rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 shadow-xl ring-1 ring-white/5">
          <p className="mb-3 text-[10px] leading-relaxed text-zinc-500">
            The names are thematic. Each switch below changes the real HTTP request: which model tier runs,
            how much chat history is kept, and extra system text — not quantum hardware.
          </p>

          <div className="space-y-3 border-b border-zinc-800/80 pb-3">
            <label className="block">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-zinc-200">Kolmogorov router</span>
                <input
                  type="checkbox"
                  className={!canK ? "cursor-pointer opacity-60" : undefined}
                  checked={canK && quantum.kolmogorov}
                  onChange={(e) => {
                    if (!canK) {
                      uiDiag("header.quantum.kolmogorov", "skip", { planId: plan.id, reason: "needs_upgrade" });
                      onRequestUpgrade();
                      return;
                    }
                    uiDiag("header.quantum.kolmogorov", "ok", { planId: plan.id, on: e.target.checked });
                    onQuantum({ ...quantum, kolmogorov: e.target.checked });
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                When on, the server picks a model tier from your <strong className="font-medium text-zinc-400">last user</strong>{" "}
                message using topic keywords and length (not formal Kolmogorov complexity — a routing heuristic). It overrides
                the Model dropdown for that send. A short reason appears in the header after each reply.
              </p>
            </label>

            <label className="block">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-zinc-200">Holographic context</span>
                <input
                  type="checkbox"
                  className={!canH ? "cursor-pointer opacity-60" : undefined}
                  checked={canH && quantum.holographic}
                  onChange={(e) => {
                    if (!canH) {
                      uiDiag("header.quantum.holographic", "skip", { planId: plan.id, reason: "needs_upgrade" });
                      onRequestUpgrade();
                      return;
                    }
                    uiDiag("header.quantum.holographic", "ok", { planId: plan.id, on: e.target.checked });
                    onQuantum({ ...quantum, holographic: e.target.checked });
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                Only matters when the transcript is long (~12k+ characters). Older turns are folded or truncated so the
                outgoing prompt stays within a size budget.
              </p>
            </label>

            <label className="block">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-zinc-200">Eigenresponse / DNA</span>
                <input
                  type="checkbox"
                  className={!canDna ? "cursor-pointer opacity-60" : undefined}
                  checked={canDna && quantum.dna}
                  onChange={(e) => {
                    if (!canDna) {
                      uiDiag("header.quantum.dna", "skip", { planId: plan.id, reason: "needs_upgrade" });
                      onRequestUpgrade();
                      return;
                    }
                    uiDiag("header.quantum.dna", "ok", { planId: plan.id, on: e.target.checked });
                    onQuantum({ ...quantum, dna: e.target.checked });
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                Adds one short system line inferred from your last few <strong className="font-medium text-zinc-400">assistant</strong>{" "}
                messages (right now: concise vs detailed + mirror formality).
              </p>
            </label>
          </div>

          <label className="mt-3 block text-zinc-400">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-zinc-200">Adiabatic morph</span>
              {canDna ? (
                <span className="text-[10px] text-cyan-500/90">
                  {quantum.adiabatic < 1 / 3
                    ? "explore"
                    : quantum.adiabatic < 2 / 3
                      ? "balance"
                      : "commit"}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600">Pro</span>
              )}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              disabled={!canDna}
              title={
                canDna
                  ? "Maps to explore / balance / commit text merged into the system prompt"
                  : "Unlock with Pro — Eigenresponse / DNA — click to open Plans"
              }
              value={canDna ? Math.round(quantum.adiabatic * 100) : 50}
              onChange={(e) => {
                if (!canDna) {
                  uiDiag("header.quantum.adiabatic", "skip", { planId: plan.id, reason: "needs_upgrade" });
                  onRequestUpgrade();
                  return;
                }
                const a = Number(e.target.value) / 100;
                uiDiag("header.quantum.adiabatic", "ok", { planId: plan.id, value: a });
                onQuantum({ ...quantum, adiabatic: a });
              }}
              className={`mt-1 w-full ${!canDna ? "cursor-pointer opacity-60" : ""}`}
            />
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
              Slider position picks a stance label merged into the system prompt: lower ≈ explore ideas, middle ≈ balance,
              higher ≈ commit to a direction (wording only — not a physics simulation).
            </p>
          </label>

          {!canK || !canH || !canDna ? (
            <button
              type="button"
              className="mt-3 w-full rounded-lg bg-zinc-900 py-1.5 text-[11px] text-cyan-300 ring-1 ring-zinc-800 hover:bg-zinc-800"
              onClick={() => {
                uiDiag("header.quantum.viewPlans", "ok", { planId: plan.id });
                onRequestUpgrade();
              }}
            >
              View plans for full quantum stack
            </button>
          ) : null}
        </div>
      </details>
    </div>
  );
}
