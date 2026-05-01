"use client";

import { useMemo } from "react";

const SEGMENT_COLORS = [
  "border-cyan-500/40 bg-cyan-500/10 text-cyan-100/95",
  "border-violet-500/40 bg-violet-500/10 text-violet-100/95",
  "border-amber-500/40 bg-amber-500/10 text-amber-100/95",
  "border-emerald-500/40 bg-emerald-500/10 text-emerald-100/95",
];

function segmentThinking(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const byPara = t.split(/\n{2,}/).filter(Boolean);
  if (byPara.length > 1) return byPara.slice(-12);
  const words = t.split(/\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).length > 140 && cur) {
      chunks.push(cur.trim());
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks.slice(-10);
}

export function ThinkingCanvas({
  text,
  active,
}: {
  /** Streaming or final reasoning text */
  text: string;
  /** Pulse / animate when model is still streaming */
  active: boolean;
}) {
  const segments = useMemo(() => segmentThinking(text), [text]);

  if (!text.trim()) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/70 ring-1 ring-white/5">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              active ? "animate-pulse bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" : "bg-zinc-600"
            }`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Thinking canvas
          </span>
        </div>
        {active ? (
          <span className="font-mono text-[10px] text-cyan-400/90">streaming…</span>
        ) : (
          <span className="text-[10px] text-zinc-600">complete</span>
        )}
      </div>
      <div className="relative max-h-[min(220px,28vh)] overflow-y-auto px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {segments.map((seg, i) => (
            <span
              key={`${i}-${seg.slice(0, 12)}`}
              className={`inline-block max-w-full rounded-lg border px-2 py-1 text-[11px] leading-snug ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`}
            >
              {seg}
            </span>
          ))}
        </div>
        {active ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 to-transparent" />
        ) : null}
      </div>
    </div>
  );
}
