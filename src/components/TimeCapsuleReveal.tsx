"use client";

import { useRef } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { TimeCapsule } from "@/lib/time-capsule";

export function TimeCapsuleReveal({
  capsule,
  onDismiss,
}: {
  capsule: TimeCapsule;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(true, ref, onDismiss);

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capsule-title"
        className="w-full max-w-md rounded-2xl border border-cyan-800/50 bg-zinc-950 p-6 shadow-2xl ring-1 ring-cyan-500/20"
      >
        <h2 id="capsule-title" className="text-lg font-semibold text-cyan-100">
          Message from your past self
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{capsule.message}</p>
        <p className="mt-4 text-[11px] text-zinc-500">
          Scheduled for {new Date(capsule.revealAt).toLocaleString()}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
