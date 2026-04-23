"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function magicMessage(code: string | null): string | null {
  switch (code) {
    case "invalid":
      return "That sign-in link expired or was already used. Sign in with the shared app password, or ask the person who manages Vercel for the current password.";
    case "missing":
      return "Sign-in link was incomplete. Use the password field above, or get a fresh link from your admin.";
    case "config":
      return "Sign-in links are not configured on this server. Use the shared app password.";
    case "off":
      return "The app gate is off for this deployment.";
    default:
      return null;
  }
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const banner = magicMessage(searchParams.get("magic"));

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
          This deployment uses <strong className="font-medium text-zinc-400">one shared password</strong> for everyone
          (<code className="text-zinc-400">BBGPT_APP_PASSWORD</code> on the server). There are no separate per-user passwords
          to “reset” from this page.
        </p>
        <p className="mt-2 text-center text-[11px] text-zinc-600">
          Use the same hostname you always use (e.g. only <code className="text-zinc-500">www.bbgpt.ai</code> or only the
          <code className="text-zinc-500"> .vercel.app </code>
          URL) so the session cookie applies.
        </p>
        {banner ? <p className="mt-3 rounded-lg bg-amber-950/40 px-3 py-2 text-center text-[11px] text-amber-200/90">{banner}</p> : null}
        <div className="mt-6 space-y-3">
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block text-xs text-zinc-400">
              Shared app password
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
          </form>
          <button
            type="button"
            onClick={() => setForgotOpen((open) => !open)}
            aria-expanded={forgotOpen}
            aria-controls="forgot-password-panel"
            className="w-full pt-1 text-center text-sm font-medium text-emerald-500/90 underline-offset-2 hover:text-emerald-400 hover:underline"
          >
            Forgot password? / Change the shared password
          </button>
          {forgotOpen ? (
            <div
              id="forgot-password-panel"
              className="space-y-3 rounded-xl border border-zinc-700/80 bg-zinc-950/60 p-4 text-left text-[11px] leading-relaxed text-zinc-400"
            >
              <p className="font-medium text-zinc-300">Rotating access (one password for all users)</p>
              <p>
                To <strong className="text-zinc-400">set a new shared password</strong> that everyone will use on the next
                request:
              </p>
              <ol className="list-decimal space-y-2 pl-4 marker:text-zinc-600">
                <li>
                  Open <strong className="text-zinc-400">Vercel</strong> → your project →{" "}
                  <strong className="text-zinc-400">Settings → Environment Variables</strong> → <strong className="text-zinc-400">Production</strong>.
                </li>
                <li>
                  Edit <code className="text-zinc-300">BBGPT_APP_PASSWORD</code> (or legacy <code className="text-zinc-300">BABYGPT_APP_PASSWORD</code>) — enter the new password
                  value, save.
                </li>
                <li>
                  <strong className="text-zinc-400">Redeploy</strong> the project (Deployments → … → Redeploy) so running
                  instances pick up the new value, then try signing in with the new password.
                </li>
              </ol>
              <p className="border-t border-zinc-800 pt-3 text-zinc-500">
                Optional email sign-in links require <code className="text-zinc-400">RESEND_API_KEY</code>,{" "}
                <code className="text-zinc-400">EMAIL_FROM</code>, and{" "}
                <code className="text-zinc-400">BBGPT_MAGIC_LINK_EMAILS</code> — see{" "}
                <code className="text-zinc-400">deploy/LAUNCH-HANDOFF.md</code>. Operators can also run{" "}
                <code className="text-zinc-300">npm run magic:link -- email https://your-host</code> locally with secrets.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 text-sm text-zinc-500">Loading…</div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
