"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutReturnClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id")?.trim();
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/stripe/finalize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json()) as { error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setFinalizeError(data.error ?? "Could not confirm your subscription.");
        return;
      }
      try {
        await fetch("/api/credits", { credentials: "include", cache: "no-store" });
      } catch {
        /* best-effort refresh before landing in app */
      }
      router.replace("/");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

  if (!sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-center">
        <p className="text-sm text-red-400">Missing checkout session. Return to the app and try again.</p>
        <Link href="/" className="text-sm text-cyan-400 underline">
          Back to bbGPT
        </Link>
      </div>
    );
  }

  if (finalizeError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-center">
        <p className="text-sm text-red-400">{finalizeError}</p>
        <Link href="/" className="text-sm text-cyan-400 underline">
          Back to bbGPT
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-center">
      <p className="text-sm text-zinc-400">Confirming your subscription…</p>
    </div>
  );
}
