"use client";

export function ConversationTopology({ active = 3 }: { active?: number }) {
  const nodes = Array.from({ length: 7 }, (_, i) => i);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="mb-2 text-xs font-medium text-zinc-400">Topology</div>
      <svg viewBox="0 0 240 90" className="h-20 w-full text-zinc-600" aria-hidden>
        {nodes.map((i) => (
          <circle
            key={i}
            cx={30 + i * 30}
            cy={40 + (i % 3) * 8}
            r={i === active ? 6 : 4}
            className={i === active ? "fill-cyan-400/70" : "fill-zinc-700"}
          />
        ))}
        {nodes.slice(0, -1).map((i) => (
          <line
            key={`e-${i}`}
            x1={30 + i * 30}
            y1={40 + (i % 3) * 8}
            x2={30 + (i + 1) * 30}
            y2={40 + ((i + 1) % 3) * 8}
            stroke="currentColor"
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  );
}
