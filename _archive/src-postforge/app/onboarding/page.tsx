"use client";

import { useEffect } from "react";

export default function OnboardingPage() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/onboarding", { method: "POST" });
        if (res.status === 401) {
          window.location.href = "/auth/signin";
          return;
        }
        if (!res.ok) throw new Error("onboarding failed");
        if (!cancelled) {
          window.location.href = "/dashboard";
        }
      } catch {
        /* keep showing card + spinner per spec */
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-xl">
        <p className="mb-6 text-lg font-medium text-zinc-100">
          Setting up your workspace...
        </p>
        <div className="flex justify-center">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
