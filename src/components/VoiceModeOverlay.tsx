"use client";

import { useEffect } from "react";

/**
 * Voice capture overlay — Grok-inspired “eyes” + ChatGPT-style soft orb / waveform.
 * Browser SpeechRecognition only; visual pattern follows common consumer chat apps.
 */
export function VoiceModeOverlay({
  open,
  listening,
  interimText,
  readAloud,
  onReadAloudChange,
  onDone,
}: {
  open: boolean;
  listening: boolean;
  interimText: string;
  readAloud?: boolean;
  onReadAloudChange?: (next: boolean) => void;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDone();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onDone]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Dimmed backdrop — click outside panel to dismiss (ChatGPT-style) */}
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xl"
        aria-label="Close voice mode"
        onClick={onDone}
      />

      <div
        className="relative z-10 flex w-full max-w-lg flex-col items-center px-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="babygpt-voice-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onDone}
          className="absolute -right-1 -top-2 z-20 rounded-full p-2 text-zinc-500 ring-1 ring-zinc-700/80 transition hover:bg-zinc-900/90 hover:text-zinc-200 sm:right-0 sm:top-0"
          aria-label="Close voice mode"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative flex min-h-[280px] w-full flex-col items-center">
          <h2 id="babygpt-voice-title" className="sr-only">
            Voice input
          </h2>

          {/* ChatGPT-like ambient orb */}
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 h-[min(60vw,280px)] w-[min(60vw,280px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-400/25 via-violet-500/15 to-transparent blur-3xl transition-opacity duration-500 ${
              listening ? "opacity-100 animate-pulse" : "opacity-40"
            }`}
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(50vw,220px)] w-[min(50vw,220px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/10" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(45vw,200px)] w-[min(45vw,200px)] -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-white/5 opacity-30 [animation-duration:2.8s]" />

          {/* Grok-style “eyes” */}
          <div className="relative z-10 mt-4 flex items-center justify-center gap-6 sm:gap-10">
            <div
              className={`babygpt-voice-eye h-11 w-[4.25rem] rounded-[999px] bg-gradient-to-b from-white/25 via-cyan-100/10 to-zinc-950 shadow-[0_0_40px_rgba(34,211,238,0.45)] ring-1 ring-cyan-400/25 ${
                listening ? "babygpt-voice-eye--active" : "opacity-60"
              }`}
            />
            <div
              className={`babygpt-voice-eye babygpt-voice-eye--lag h-11 w-[4.25rem] rounded-[999px] bg-gradient-to-b from-white/25 via-violet-100/10 to-zinc-950 shadow-[0_0_40px_rgba(139,92,246,0.35)] ring-1 ring-violet-400/20 ${
                listening ? "babygpt-voice-eye--active" : "opacity-60"
              }`}
            />
          </div>

          {/* Mini waveform (ChatGPT / voice-assistant trope) */}
          <div className="relative z-10 mt-12 flex h-10 items-end justify-center gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full bg-gradient-to-t from-cyan-600/90 to-cyan-300/80 ${
                  listening ? "babygpt-voice-bar" : "h-1 opacity-30"
                }`}
                style={listening ? { animationDelay: `${i * 0.08}s` } : undefined}
              />
            ))}
          </div>

          <p className="relative z-10 mt-8 min-h-[3rem] max-w-md px-4 text-center text-sm leading-relaxed text-zinc-300">
            {interimText.trim() ? (
              <span className="text-zinc-100">{interimText}</span>
            ) : (
              <span className="text-zinc-500">
                {listening ? "Speak naturally — text appears in your message." : "Starting microphone…"}
              </span>
            )}
          </p>

          {onReadAloudChange ? (
            <label className="relative z-10 mt-6 flex cursor-pointer items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400">
              <input
                type="checkbox"
                checked={readAloud ?? false}
                onChange={(e) => onReadAloudChange(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-900 accent-cyan-500"
              />
              Read assistant replies aloud when each reply finishes
            </label>
          ) : null}

          <button
            type="button"
            onClick={onDone}
            className="relative z-10 mt-10 rounded-full bg-zinc-100 px-8 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/30 transition hover:bg-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
