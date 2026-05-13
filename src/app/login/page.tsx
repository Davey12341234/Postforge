"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthBranding } from "@/components/auth/AuthBranding";
import {
  AuthShell,
  AuthPageSkeleton,
  authCardClass,
  authFieldClass,
  authLinkClass,
  authPrimaryButtonClass,
} from "@/components/auth/AuthShell";

const userAuthUi = process.env.NEXT_PUBLIC_BBGPT_USER_AUTH === "1";

function magicMessage(code: string | null): string | null {
  switch (code) {
    case "invalid":
      return userAuthUi
        ? "That sign-in link expired or is invalid. Try signing in with email and password."
        : "That sign-in link expired or was already used. Sign in with the shared app password, or ask the person who manages Vercel for the current password.";
    case "missing":
      return "Sign-in link was incomplete. Use the form below.";
    case "config":
      return "Sign-in links are not configured on this server.";
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
  const resetOk = searchParams.get("reset") === "ok";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = userAuthUi
        ? { email: email.trim(), password }
        : { password: password.trim() };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    <AuthShell>
      <div className={authCardClass}>
        <AuthBranding title="bbGPT" />
        {userAuthUi ? (
          <p className="mt-2 text-center text-xs text-zinc-500">
            Sign in with your account email and password. New here?{" "}
            <Link href="/register" className={authLinkClass}>
              Create an account
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mt-2 text-center text-xs text-zinc-500">
              This deployment uses a <strong className="font-medium text-zinc-400">shared app password</strong> (
              <code className="text-zinc-400">BBGPT_APP_PASSWORD</code> on the server).
            </p>
            <p className="mt-2 text-center text-[11px] text-zinc-600">
              Use the same hostname you always use so the session cookie applies.
            </p>
          </>
        )}
        {banner ? <p className="mt-3 rounded-lg bg-amber-950/40 px-3 py-2 text-center text-[11px] text-amber-200/90">{banner}</p> : null}
        {resetOk ? (
          <p className="mt-3 rounded-lg bg-emerald-950/35 px-3 py-2 text-center text-[11px] text-emerald-200/95">
            Password updated. Sign in with your new password.
          </p>
        ) : null}
        <div className="mt-6 space-y-3">
          <form className="space-y-3" onSubmit={onSubmit}>
            {userAuthUi ? (
              <label className="block text-xs text-zinc-400">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={authFieldClass}
                  required
                />
              </label>
            ) : null}
            <label className="block text-xs text-zinc-400">
              Password
              <input
                type="password"
                autoComplete={userAuthUi ? "current-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={authFieldClass}
                required
              />
            </label>
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className={authPrimaryButtonClass}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {userAuthUi ? (
            <p className="pt-1 text-center text-sm">
              <Link href="/forgot-password" className={authLinkClass}>
                Forgot password?
              </Link>
            </p>
          ) : null}
          {userAuthUi ? null : (
            <>
              <button
                type="button"
                onClick={() => setForgotOpen((open) => !open)}
                aria-expanded={forgotOpen}
                aria-controls="forgot-password-panel"
                className="min-h-[48px] w-full rounded-lg pt-2 text-center text-sm font-medium text-emerald-500/90 underline-offset-2 hover:bg-zinc-800/30 hover:text-emerald-400 hover:underline sm:min-h-0 sm:pt-1"
              >
                Forgot password? / Change the shared password
              </button>
              {forgotOpen ? (
                <div
                  id="forgot-password-panel"
                  className="space-y-3 rounded-xl border border-zinc-700/80 bg-zinc-950/60 p-4 text-left text-[11px] leading-relaxed text-zinc-400"
                >
                  <p className="font-medium text-zinc-300">Rotating the shared password</p>
                  <ol className="list-decimal space-y-2 pl-4 marker:text-zinc-600">
                    <li>Vercel → Settings → Environment Variables → Production.</li>
                    <li>
                      Edit <code className="text-zinc-300">BBGPT_APP_PASSWORD</code>, save, then redeploy.
                    </li>
                  </ol>
                  <p className="border-t border-zinc-800 pt-3 text-zinc-500">
                    Optional magic links: <code className="text-zinc-400">deploy/LAUNCH-HANDOFF.md</code>
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <AuthPageSkeleton />
        </AuthShell>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
