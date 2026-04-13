"use client";

import { useMemo } from "react";

export type SmartAction = { id: string; label: string; prompt: string };

function pickActions(assistantText: string, lastUserText: string): SmartAction[] {
  const a = assistantText.trim();
  const u = lastUserText.toLowerCase();
  const al = a.toLowerCase();
  const out: SmartAction[] = [];

  const push = (id: string, label: string, prompt: string) => {
    if (!out.some((x) => x.id === id)) out.push({ id, label, prompt });
  };

  push("deeper", "Go deeper", "Go deeper with concrete examples, edge cases, and one counterargument.");
  push("simplify", "Simplify", "Explain the same core idea in simpler language with a short analogy.");
  push("angle", "Another angle", "Approach the topic from a different angle (assumptions, audience, or format).");

  const looksCode =
    a.includes("```") || /\b(function|class|def|const|let|import|export)\b/.test(al);
  if (looksCode) {
    push("bugs", "Find issues", "Review the code above for bugs or footguns; suggest minimal patches.");
    push("tests", "Add tests", "Propose focused unit tests (cases + assertions) for the code above.");
    push("optimize", "Optimize", "Suggest performance or readability optimizations without changing behavior.");
  }

  if (/\b(explain|why|how)\b/.test(u) || /\bconcept|understand\b/.test(u)) {
    push("quiz", "Quiz me", "Give me 3 quick questions to check my understanding, then answers.");
  }

  if (a.length > 400) {
    push("summary", "TL;DR", "Give a tight bullet TL;DR of your last reply (max 5 bullets).");
  }

  return out.slice(0, 6);
}

export function SmartActions({
  assistantText,
  lastUserText,
  onAction,
  disabled,
}: {
  assistantText: string;
  lastUserText: string;
  onAction: (prompt: string) => void;
  disabled?: boolean;
}) {
  const actions = useMemo(() => pickActions(assistantText, lastUserText), [assistantText, lastUserText]);

  if (!assistantText.trim() || actions.length === 0) return null;

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-950/30 px-4 py-3">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Smart actions
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((act) => (
            <button
              key={act.id}
              type="button"
              disabled={disabled}
              onClick={() => onAction(act.prompt)}
              className="rounded-full bg-zinc-900/90 px-3 py-1.5 text-[11px] font-medium text-zinc-200 ring-1 ring-zinc-700/80 transition hover:bg-zinc-800 hover:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
