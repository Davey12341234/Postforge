"use client";

import type { PlanDefinition } from "@/lib/plans";
import { planAllowsModel } from "@/lib/plans";
import type { ModelTier } from "@/lib/types";

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
    <div id={id} className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        Model
        <select
          value={model}
          title={plan.modelHighlights[model]}
          onChange={(e) => {
            const v = e.target.value as ModelTier;
            if (!planAllowsModel(plan, v)) {
              onRequestUpgrade();
              return;
            }
            onModel(v);
          }}
          className="max-w-[140px] rounded-lg bg-zinc-900 px-2 py-1 text-xs text-zinc-100 ring-1 ring-zinc-800"
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
            ? "Use chain-of-thought style reasoning when the provider supports it"
            : "Upgrade your plan to enable Thinking (click to open Plans)"
        }
        onClick={() => {
          if (!canThinking) {
            onRequestUpgrade();
            return;
          }
          onThinking(!thinking);
        }}
        className={`rounded-full px-3 py-1 text-xs ring-1 ${
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
            ? "Schrödinger (dual-stream) requires Pro or Team — click to open Plans"
            : agentMode
              ? "Turn off Agent first — then you can enable Schrödinger dual-stream"
              : "Run two models in parallel and keep the stronger reply"
        }
        onClick={() => {
          if (agentMode) return;
          if (!canSchrodinger) {
            onRequestUpgrade();
            return;
          }
          onSchrodinger(!schrodinger);
        }}
        className={`rounded-full px-3 py-1 text-xs ring-1 ${
          agentMode
            ? "cursor-not-allowed opacity-40"
            : !canSchrodinger
              ? "cursor-pointer opacity-60 hover:opacity-90"
              : schrodinger
                ? "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30"
                : "bg-zinc-900 text-zinc-400 ring-zinc-800"
        }`}
      >
        Schrödinger
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
            onRequestUpgrade();
            return;
          }
          const next = !agentMode;
          onAgentMode(next);
          if (next) onSchrodinger(false);
        }}
        className={`rounded-full px-3 py-1 text-xs ring-1 ${
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
        <summary className="cursor-pointer list-none rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800">
          Quantum
        </summary>
        <div className="absolute right-0 z-40 mt-2 w-[280px] rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 shadow-xl ring-1 ring-white/5">
          <label className="flex items-center justify-between gap-2 py-1">
            <span title="Auto-pick model tier from prompt complexity">Kolmogorov router</span>
            <input
              type="checkbox"
              className={!canK ? "cursor-pointer opacity-60" : undefined}
              checked={canK && quantum.kolmogorov}
              onChange={(e) => {
                if (!canK) {
                  onRequestUpgrade();
                  return;
                }
                onQuantum({ ...quantum, kolmogorov: e.target.checked });
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-1">
            <span title="Fold long context for leaner prompts">Holographic context</span>
            <input
              type="checkbox"
              className={!canH ? "cursor-pointer opacity-60" : undefined}
              checked={canH && quantum.holographic}
              onChange={(e) => {
                if (!canH) {
                  e.preventDefault();
                  onRequestUpgrade();
                  return;
                }
                onQuantum({ ...quantum, holographic: e.target.checked });
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-1">
            <span title="Lock style from recent turns">Eigenresponse / DNA</span>
            <input
              type="checkbox"
              className={!canDna ? "cursor-pointer opacity-60" : undefined}
              checked={canDna && quantum.dna}
              onChange={(e) => {
                if (!canDna) {
                  onRequestUpgrade();
                  return;
                }
                onQuantum({ ...quantum, dna: e.target.checked });
              }}
            />
          </label>
          <label className="mt-2 block text-zinc-500">
            Adiabatic morph
            <input
              type="range"
              min={0}
              max={100}
              title={canDna ? "Blend strength for adiabatic prompt morph" : "Unlock with Pro (DNA feature) — click to open Plans"}
              value={canDna ? Math.round(quantum.adiabatic * 100) : 50}
              onChange={(e) => {
                if (!canDna) {
                  onRequestUpgrade();
                  return;
                }
                onQuantum({ ...quantum, adiabatic: Number(e.target.value) / 100 });
              }}
              className={`mt-1 w-full ${!canDna ? "cursor-pointer opacity-60" : ""}`}
            />
          </label>
          {!canK || !canH || !canDna ? (
            <button
              type="button"
              className="mt-2 w-full rounded-lg bg-zinc-900 py-1.5 text-[11px] text-cyan-300 ring-1 ring-zinc-800 hover:bg-zinc-800"
              onClick={onRequestUpgrade}
            >
              View plans for full quantum stack
            </button>
          ) : null}
        </div>
      </details>
    </div>
  );
}
