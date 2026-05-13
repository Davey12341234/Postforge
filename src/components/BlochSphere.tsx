"use client";

export function BlochSphere({ theta = 0.35 }: { theta?: number }) {
  return (
    <div className="relative h-28 w-28" aria-hidden>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/30 via-fuchsia-500/20 to-indigo-500/30 blur-md" />
      <div
        className="absolute inset-2 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-950 ring-1 ring-zinc-800"
        style={{ transform: `rotate(${theta}rad)` }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium tracking-wide text-zinc-500">
        |ψ⟩
      </div>
    </div>
  );
}
