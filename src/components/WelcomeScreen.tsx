"use client";

import Image from "next/image";
import { QUANTUM_FEATURES } from "@/lib/types";
import type { PlanDefinition } from "@/lib/plans";
import type { PowerTemplate } from "@/lib/instant-templates";
import { BlochSphere } from "./BlochSphere";
import { ConversationTopology } from "./ConversationTopology";
import { InstantTemplates } from "./InstantTemplates";

export function WelcomeScreen({
  onOpenPlans,
  onOpenSearch,
  onJumpToQuantum,
  plan,
  onPickTemplate,
}: {
  onOpenPlans: () => void;
  onOpenSearch: () => void;
  /** Scrolls the header Quantum controls into view — connects illustrations to real toggles. */
  onJumpToQuantum: () => void;
  plan: PlanDefinition;
  onPickTemplate: (t: PowerTemplate) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <Image
          src="/babygpt-logo.png"
          alt="BabyGPT"
          width={88}
          height={88}
          priority
          style={{ width: "auto", height: "auto" }}
          className="drop-shadow-[0_0_24px_rgba(34,211,238,0.25)]"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">BabyGPT</h1>
          <p className="mt-2 text-sm text-zinc-400">
            A dark, ChatGPT-style UI with quantum-inspired controls — powered by{" "}
            <span className="text-zinc-300">z-ai-web-dev-sdk</span> on the server.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={onOpenPlans}
              className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-white"
            >
              Plans & credits
            </button>
            <button
              type="button"
              onClick={onOpenSearch}
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-800 hover:bg-zinc-800"
            >
              Search chats (⌘/Ctrl+K)
            </button>
          </div>
        </div>
      </div>

      <InstantTemplates plan={plan} onPick={onPickTemplate} />

      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-center">
        <p className="text-xs text-zinc-400">
          The Bloch sphere and topology graphic are <span className="text-zinc-300">illustrations</span>. Use the
          header bar to turn on Kolmogorov routing, holographic context, DNA, and more.
        </p>
        <button
          type="button"
          onClick={onJumpToQuantum}
          className="mt-3 rounded-full bg-cyan-950/50 px-4 py-2 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-900/60 hover:bg-cyan-900/40"
        >
          Jump to live Quantum controls
        </button>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 text-sm font-medium text-zinc-200">Quantum feature showcase</div>
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
