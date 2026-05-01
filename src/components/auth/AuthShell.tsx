import type { ReactNode } from "react";

/**
 * Shared auth page layout: safe areas, scroll when the keyboard shrinks the viewport, centered card.
 * Inputs use `authFieldClass` / `authPrimaryButtonClass` for 44px+ touch and 16px text on small screens (reduces iOS zoom-on-focus).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-col overflow-y-auto overscroll-y-contain bg-zinc-950 supports-[min-height:100dvh]:min-h-[100dvh]">
      <div className="mx-auto flex w-full max-w-[min(100%,24rem)] flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">{children}</div>
      </div>
    </div>
  );
}

/** Skeleton matching auth card + fields to reduce layout shift while Suspense streams. */
export function AuthPageSkeleton() {
  return (
    <div className={authCardClass} aria-busy="true" aria-label="Loading">
      <div className="mx-auto flex w-full max-w-[8rem] flex-col items-center gap-3">
        <div className="h-[72px] w-[72px] animate-pulse rounded-2xl bg-zinc-800/55" />
        <div className="h-5 w-36 animate-pulse rounded-md bg-zinc-800/45" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-[52px] animate-pulse rounded-xl bg-zinc-800/40" />
        <div className="h-[52px] animate-pulse rounded-xl bg-zinc-800/40" />
        <div className="h-[48px] animate-pulse rounded-xl bg-zinc-800/35" />
      </div>
    </div>
  );
}

export const authCardClass =
  "w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-xl ring-1 ring-white/5 sm:p-6";

export const authFieldClass =
  "mt-1.5 w-full min-h-[48px] rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base leading-snug text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-emerald-500/40 sm:min-h-11 sm:py-2.5 sm:text-sm";

export const authPrimaryButtonClass =
  "min-h-12 w-full rounded-xl bg-zinc-100 py-3 text-base font-semibold text-zinc-950 shadow-sm hover:bg-white active:bg-zinc-200 disabled:opacity-50 sm:min-h-11 sm:py-2.5 sm:text-sm";

export const authLinkClass =
  "rounded-md px-1 py-2 font-medium text-emerald-500/90 underline-offset-2 hover:bg-emerald-500/10 hover:text-emerald-400 hover:underline";
