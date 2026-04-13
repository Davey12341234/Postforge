"use client";

import { useState, type ReactNode } from "react";

export function ChatInput({
  disabled,
  onSend,
  skillSuggestion,
  onUseSkill,
  onDraftChange,
  value: controlledValue,
  onValueChange,
  children,
}: {
  disabled?: boolean;
  onSend: (text: string) => void | Promise<void>;
  skillSuggestion?: { name: string } | null;
  onUseSkill?: () => void;
  onDraftChange?: (text: string) => void;
  /** Controlled input (templates, sync with parent mood/cost preview) */
  value?: string;
  onValueChange?: (text: string) => void;
  /** e.g. CostPreview above the textarea */
  children?: ReactNode;
}) {
  const [internal, setInternal] = useState("");
  const controlled = controlledValue !== undefined;
  const value = controlled ? controlledValue! : internal;

  function setValue(next: string) {
    if (controlled) onValueChange?.(next);
    else setInternal(next);
    onDraftChange?.(next);
  }

  async function submit() {
    const t = value.trim();
    if (!t || disabled) return;
    setValue("");
    await onSend(t);
  }

  return (
    <div className="border-t border-zinc-900 bg-zinc-950/40 p-3">
      {children}
      {skillSuggestion ? (
        <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
          <span>
            Use skill: <span className="text-zinc-200">{skillSuggestion.name}</span>?
          </span>
          <button
            type="button"
            className="rounded-lg bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-cyan-300 ring-1 ring-zinc-800 hover:bg-zinc-800"
            onClick={() => onUseSkill?.()}
          >
            Activate
          </button>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-3xl gap-2">
        <textarea
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={3}
          placeholder="Message BabyGPT…"
          className="min-h-[52px] flex-1 resize-none rounded-2xl bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-cyan-500/30 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={() => void submit()}
          className="h-[52px] shrink-0 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
      <div className="mx-auto mt-2 max-w-3xl text-[11px] text-zinc-600">
        Enter sends · Shift+Enter newline
      </div>
    </div>
  );
}
