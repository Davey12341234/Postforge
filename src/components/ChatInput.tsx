"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { formatBytes } from "@/lib/file-attachments";
import { getClientMaxFileBytes, getInlineAttachmentMaxBytes } from "@/lib/attachment-config";
import { getSpeechRecognitionConstructor } from "@/lib/speech-recognition";

export function ChatInput({
  disabled,
  onSend,
  skillSuggestion,
  onUseSkill,
  onDraftChange,
  value: controlledValue,
  onValueChange,
  children,
  pendingFiles,
  onPendingFilesChange,
  onGenerateImage,
  geminiEnabled,
  readAloud,
  onReadAloudChange,
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
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  /** Opens Gemini image generation (requires GEMINI_API_KEY on server). */
  onGenerateImage?: () => void;
  geminiEnabled?: boolean;
  /** When true, new assistant replies are read with browser text-to-speech after streaming completes. */
  readAloud?: boolean;
  onReadAloudChange?: (next: boolean) => void;
}) {
  const [internal, setInternal] = useState("");
  const controlled = controlledValue !== undefined;
  const value = controlled ? controlledValue! : internal;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognition | null>(null);
  const valueRef = useRef("");
  const [listening, setListening] = useState(false);
  const maxBytes = getClientMaxFileBytes();
  const inlineMax = getInlineAttachmentMaxBytes();
  const voiceCtor = typeof window !== "undefined" ? getSpeechRecognitionConstructor() : null;

  valueRef.current = value;

  const setValue = useCallback(
    (next: string) => {
      if (controlled) onValueChange?.(next);
      else setInternal(next);
      onDraftChange?.(next);
    },
    [controlled, onDraftChange, onValueChange],
  );

  const stopVoice = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => () => stopVoice(), [stopVoice]);

  const startVoice = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor || disabled) return;
    stopVoice();
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = typeof navigator !== "undefined" ? navigator.language : "en-US";
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let chunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r?.isFinal) chunk += r[0]?.transcript ?? "";
      }
      const t = chunk.trim();
      if (!t) return;
      const cur = valueRef.current.trim();
      const sep = cur && !cur.endsWith(" ") ? " " : "";
      setValue(`${cur}${sep}${t}`);
    };
    rec.onerror = () => {
      stopVoice();
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      stopVoice();
    }
  }, [disabled, setValue, stopVoice]);

  function toggleVoice() {
    if (listening) stopVoice();
    else startVoice();
  }

  async function submit() {
    const t = value.trim();
    if ((!t && pendingFiles.length === 0) || disabled) return;
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
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = e.target.files;
          if (!list?.length) return;
          onPendingFilesChange([...pendingFiles, ...Array.from(list)]);
          e.target.value = "";
        }}
      />
      {pendingFiles.length > 0 ? (
        <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
          {pendingFiles.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 ring-1 ring-zinc-800"
            >
              <span className="max-w-[200px] truncate">{f.name}</span>
              <span className="text-zinc-500">({formatBytes(f.size)})</span>
              <button
                type="button"
                className="text-zinc-500 hover:text-zinc-200"
                onClick={() => onPendingFilesChange(pendingFiles.filter((_, j) => j !== i))}
                aria-label="Remove file"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="mx-auto flex max-w-3xl flex-wrap items-end gap-2">
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-[11px] font-semibold text-zinc-200 ring-1 ring-zinc-800 hover:bg-zinc-800 disabled:opacity-40"
            title={`Attach files (max ${formatBytes(maxBytes)} each)`}
          >
            Attach
          </button>
          <button
            type="button"
            disabled={disabled || !voiceCtor}
            onClick={toggleVoice}
            className={`rounded-xl px-3 py-2 text-[11px] font-semibold ring-1 disabled:opacity-40 ${
              listening
                ? "bg-rose-950/90 text-rose-100 ring-rose-700/80"
                : "bg-zinc-900 text-cyan-100 ring-cyan-900/50 hover:bg-zinc-800"
            }`}
            title={
              voiceCtor
                ? listening
                  ? "Stop dictation"
                  : "Voice: speak to type in the message box (browser speech-to-text)"
                : "Voice input is not available in this browser"
            }
          >
            {listening ? "Listening…" : "Voice"}
          </button>
          {onGenerateImage && geminiEnabled ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onGenerateImage}
              className="rounded-xl bg-fuchsia-950/80 px-3 py-2 text-[11px] font-semibold text-fuchsia-100 ring-1 ring-fuchsia-900/80 hover:bg-fuchsia-900/60 disabled:opacity-40"
              title="Generate an image with Gemini (uses one chat credit)"
            >
              Create image
            </button>
          ) : null}
        </div>
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
          className="min-h-[52px] min-w-0 flex-1 resize-none rounded-2xl bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-cyan-500/30 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || (!value.trim() && pendingFiles.length === 0)}
          onClick={() => void submit()}
          className="h-[52px] shrink-0 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
      <div className="mx-auto mt-2 flex max-w-3xl flex-col gap-2 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="min-w-0 flex-1">
          Enter sends · Shift+Enter newline · Over {formatBytes(inlineMax)} per file uses Gemini upload (multipart) ·
          Max {formatBytes(maxBytes)} each
        </p>
        {onReadAloudChange ? (
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-zinc-500 hover:text-zinc-400">
            <input
              type="checkbox"
              checked={readAloud ?? false}
              onChange={(e) => onReadAloudChange(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 accent-cyan-600"
            />
            Read replies aloud
          </label>
        ) : null}
      </div>
    </div>
  );
}
