"use client";

import Image from "next/image";
import { QUANTUM_FEATURES } from "@/lib/types";
import type { PlanDefinition } from "@/lib/plans";
import type { PowerTemplate } from "@/lib/instant-templates";
import {
  COMPANION_WELCOME_LEAD,
  CORE_CONTROLS_SUMMARY,
  INTRO_SEVEN_QUESTIONS,
  JOURNEY_SEVEN_QUESTIONS,
  MESSAGE_MODE_PREFIXES,
} from "@/lib/companion-onboarding";
import { BlochSphere } from "./BlochSphere";
import { ConversationTopology } from "./ConversationTopology";
import { InstantTemplates } from "./InstantTemplates";

export function WelcomeScreen({
  onOpenPlans,
  onOpenSearch,
  onJumpToQuantum,
  plan,
  onPickTemplate,
  onInsertComposerText,
  introIntakeComplete = false,
}: {
  onOpenPlans: () => void;
  onOpenSearch: () => void;
  /** Scrolls the header Quantum controls into view — connects illustrations to real toggles. */
  onJumpToQuantum: () => void;
  plan: PlanDefinition;
  onPickTemplate: (t: PowerTemplate) => void;
  /** Prefill composer: full questions replace draft; mode prefixes go first. */
  onInsertComposerText: (text: string, how?: "replace" | "prefixFirst") => void;
  /** True after the blocking seven-question intake has been completed (this browser). */
  introIntakeComplete?: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-3 py-8 sm:gap-8 sm:px-4 sm:py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <Image
          src="/bbgpt-logo.png"
          alt="bbGPT"
          width={88}
          height={88}
          priority
          style={{ width: "auto", height: "auto" }}
          className="drop-shadow-[0_0_26px_rgba(167,243,208,0.35)]"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">bbGPT</h1>
          <p className="mt-2 text-sm text-zinc-400">
            A dark, ChatGPT-style UI with quantum-inspired controls — powered by{" "}
            <span className="text-zinc-300">z-ai-web-dev-sdk</span> on the server.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={onOpenPlans}
              className="min-h-11 rounded-full bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-white sm:min-h-10 sm:py-2"
            >
              Plans & credits
            </button>
            <button
              type="button"
              onClick={onOpenSearch}
              className="min-h-11 rounded-full bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-800 hover:bg-zinc-800 sm:min-h-10 sm:py-2"
            >
              Search chats (⌘/Ctrl+K)
            </button>
          </div>
        </div>
      </div>

      <section className="w-full rounded-2xl border border-cyan-900/40 bg-gradient-to-b from-cyan-950/20 to-zinc-950/40 p-4 ring-1 ring-cyan-900/30">
        <h2 className="text-sm font-semibold text-cyan-100/95">Companion — start here</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{COMPANION_WELCOME_LEAD}</p>
        {introIntakeComplete ? (
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            You already completed the connection questionnaire at first launch; your answers live in local memory
            for this browser. The list below is optional reference if you want to paste a prompt into chat or
            revisit the same themes — redo the full flow anytime from Settings.
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <details
            open={!introIntakeComplete}
            className="group rounded-xl border border-zinc-800 bg-zinc-950/60"
          >
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
              <span className="mr-2 text-cyan-500/90">▼</span>
              {introIntakeComplete
                ? "7 intro questions (optional — copy into chat if useful)"
                : "7 questions to connect & understand you"}
            </summary>
            <ol className="list-decimal space-y-2 px-3 pb-3 pl-8 text-[11px] leading-relaxed text-zinc-400">
              {INTRO_SEVEN_QUESTIONS.map((q, i) => (
                <li key={i} className="pl-1">
                  <span>{q}</span>
                  <button
                    type="button"
                    onClick={() => onInsertComposerText(`${q} `, "replace")}
                    className="ml-2 inline-flex min-h-10 shrink-0 items-center rounded-lg bg-zinc-800 px-2 py-1.5 text-[10px] font-medium text-cyan-300/90 ring-1 ring-zinc-700 hover:bg-zinc-700 sm:min-h-0 sm:px-1.5 sm:py-0.5"
                  >
                    Use in chat
                  </button>
                </li>
              ))}
            </ol>
          </details>

          <details className="group rounded-xl border border-zinc-800 bg-zinc-950/60">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
              <span className="mr-2 text-zinc-500">▶</span>7 journey questions (vision & direction)
            </summary>
            <ol className="list-decimal space-y-2 px-3 pb-3 pl-8 text-[11px] leading-relaxed text-zinc-400">
              {JOURNEY_SEVEN_QUESTIONS.map((q, i) => (
                <li key={i} className="pl-1">
                  <span>{q}</span>
                  <button
                    type="button"
                    onClick={() => onInsertComposerText(`${q} `, "replace")}
                    className="ml-2 inline-flex min-h-10 shrink-0 items-center rounded-lg bg-zinc-800 px-2 py-1.5 text-[10px] font-medium text-cyan-300/90 ring-1 ring-zinc-700 hover:bg-zinc-700 sm:min-h-0 sm:px-1.5 sm:py-0.5"
                  >
                    Use in chat
                  </button>
                </li>
              ))}
            </ol>
          </details>
        </div>

        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Message modes</div>
          <p className="mt-1 text-[10px] text-zinc-600">Tap to insert at the start of your next message.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MESSAGE_MODE_PREFIXES.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.hint}
                onClick={() => onInsertComposerText(`${m.prefix} `, "prefixFirst")}
                className="min-h-10 rounded-full bg-zinc-900 px-3 py-2 text-[11px] font-medium text-zinc-200 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:ring-cyan-800/50 sm:min-h-9 sm:py-1.5"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-[10px] leading-snug text-zinc-600">{CORE_CONTROLS_SUMMARY}</p>
      </section>

      <InstantTemplates plan={plan} onPick={onPickTemplate} />

      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-center">
        <p className="text-xs text-zinc-400">
          The Bloch sphere and topology graphic are <span className="text-zinc-300">illustrations</span>. Use the
          header bar to turn on Kolmogorov routing, holographic context, DNA, and more.
        </p>
        <button
          type="button"
          onClick={onJumpToQuantum}
          className="mt-3 min-h-11 w-full rounded-full bg-cyan-950/50 px-4 py-2.5 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-900/60 hover:bg-cyan-900/40 sm:w-auto sm:min-h-10 sm:py-2"
        >
          Jump to live Quantum controls
        </button>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 text-sm font-medium text-zinc-200">What each mode actually does</div>
          <ul className="space-y-2 text-sm text-zinc-400">
            {QUANTUM_FEATURES.map((f) => (
              <li key={f.id} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                <span>
                  <span className="text-zinc-200">{f.name}</span>
                  <span className="text-zinc-500"> — {f.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div>
              <div className="text-sm font-medium text-zinc-200">Bloch sphere</div>
              <div className="mt-1 text-xs text-zinc-500">Decorative metaphor (not a live qubit state).</div>
            </div>
            <BlochSphere />
          </div>
          <div>
            <ConversationTopology />
            <p className="mt-2 text-[10px] text-zinc-600">Sample graph — not your chat history.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
