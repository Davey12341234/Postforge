"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Login failed (${res.status})`);
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl ring-1 ring-white/5">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/bbgpt-logo.png"
            alt="bbGPT"
            width={72}
            height={72}
            priority
            style={{ width: "auto", height: "auto" }}
            className="drop-shadow-[0_0_26px_rgba(167,243,208,0.35)]"
          />
          <h1 className="text-center text-lg font-semibold text-zinc-100">bbGPT</h1>
        </div>
        <p className="mt-2 text-center text-xs text-zinc-500">
          Sign in with the app password from <code className="text-zinc-400">BBGPT_APP_PASSWORD</code> (legacy{" "}
          <code className="text-zinc-400">BABYGPT_APP_PASSWORD</code>). Use the same host
          you use for the app (e.g. only <code className="text-zinc-400">127.0.0.1</code> or only{" "}
          <code className="text-zinc-400">localhost</code>) so the session cookie applies.
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <label className="block text-xs text-zinc-400">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-emerald-500/35"
              required
            />
          </label>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => setForgotOpen((open) => !open)}
            aria-expanded={forgotOpen}
            aria-controls="forgot-password-panel"
            className="w-full pt-1 text-center text-sm font-medium text-emerald-500/90 underline-offset-2 hover:text-emerald-400 hover:underline"
          >
            Forgot password?
          </button>
          {forgotOpen ? (
            <div
              id="forgot-password-panel"
              className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 p-4 text-left text-xs leading-relaxed text-zinc-400"
            >
              <p className="font-medium text-zinc-300">Resetting your access</p>
              <p className="mt-2">
                bbGPT uses one shared login password configured on the server (<code className="text-zinc-300">BBGPT_APP_PASSWORD</code> or legacy{" "}
                <code className="text-zinc-300">BABYGPT_APP_PASSWORD</code>),
                not per-user accounts. There is nothing to retrieve from this screen.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-4 marker:text-zinc-600">
                <li>
                  <strong className="font-medium text-zinc-400">You run this app:</strong> set a new password in{" "}
                  <code className="text-zinc-300">.env.local</code>, save, restart the dev server or redeploy.
                </li>
                <li>
                  <strong className="font-medium text-zinc-400">Someone else hosts it:</strong> ask them for the current password or to
                  update <code className="text-zinc-300">BBGPT_APP_PASSWORD</code> for you on their host (e.g. Vercel → Environment
                  Variables).
                </li>
              </ul>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
