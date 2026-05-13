"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthBranding } from "@/components/auth/AuthBranding";
import {
  AuthShell,
  authCardClass,
  authFieldClass,
  authLinkClass,
  authPrimaryButtonClass,
} from "@/components/auth/AuthShell";

const userAuthUi = process.env.NEXT_PUBLIC_BBGPT_USER_AUTH === "1";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!userAuthUi) {
    return (
      <AuthShell>
        <div className={`${authCardClass} text-center text-sm text-zinc-400`}>
          <p>
            Account registration is not enabled for this deployment. Your administrator must set{" "}
            <code className="text-zinc-300">BBGPT_USER_AUTH=1</code> and{" "}
            <code className="text-zinc-300">NEXT_PUBLIC_BBGPT_USER_AUTH=1</code>, then redeploy so the sign-up UI is
            included in the build.
          </p>
          <Link href="/login" className={`${authLinkClass} mt-6 inline-block`}>
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Registration failed (${res.status})`);
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
        <AuthBranding title="Create account" />
        <p className="mt-2 text-center text-xs text-zinc-500">
          Password must be at least 8 characters. Already have an account?{" "}
          <Link href="/login" className={authLinkClass}>
            Sign in
          </Link>
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
          <label className="block text-xs text-zinc-400">
            Password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
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
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
