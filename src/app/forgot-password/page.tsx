"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthBranding } from "@/components/auth/AuthBranding";
import { AuthShell, authCardClass, authFieldClass, authLinkClass, authPrimaryButtonClass } from "@/components/auth/AuthShell";

const userAuthUi = process.env.NEXT_PUBLIC_BBGPT_USER_AUTH === "1";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        cache: "no-store",
      });
      const raw = await res.text();
      let data: { ok?: boolean; message?: string; error?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          setError(`Unexpected response (${res.status}). Try again or contact support.`);
          return;
        }
      }
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      const successCopy =
        typeof data.message === "string" && data.message.trim()
          ? data.message.trim()
          : userAuthUi
            ? "If an account exists for that email, you will receive password reset instructions shortly."
            : "If that address can receive sign-in links, you will get an email shortly.";
      setMessage(successCopy);
    } catch {
      setError("Network error — could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className={authCardClass}>
        <AuthBranding title="Forgot password" />
        <p className="mt-2 text-center text-xs text-zinc-500">
          {userAuthUi
            ? "Enter the email for your account. If it exists, we will send reset instructions (or log a link in dev when email is not configured)."
            : "Enter an email eligible for a sign-in link (magic link). See deploy/LAUNCH-HANDOFF.md for allowlists and Resend setup."}
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
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
          <button
            type="submit"
            disabled={busy}
            className={authPrimaryButtonClass}
          >
            {busy ? "Sending…" : "Send instructions"}
          </button>
          <div className="space-y-2" aria-live="polite" aria-atomic="true">
            {error ? (
              <p className="rounded-lg border border-rose-900/60 bg-rose-950/35 px-3 py-2 text-xs text-rose-200">{error}</p>
            ) : null}
            {message ? (
              <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/35 px-3 py-2 text-xs text-emerald-100/95">
                {message}
              </p>
            ) : null}
          </div>
        </form>
        <p className="mt-4 text-center text-xs text-zinc-500">
          <Link href="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
