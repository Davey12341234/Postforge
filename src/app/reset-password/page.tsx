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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!userAuthUi) {
    return (
      <AuthShell>
        <div className={`${authCardClass} text-center text-sm text-zinc-400`}>
          <p>Password reset is only available when per-user auth is enabled.</p>
          <Link href="/login" className={`${authLinkClass} mt-6 inline-block`}>
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell>
        <div className={`${authCardClass} text-center text-sm text-zinc-400`}>
          <p>Missing reset token. Open the link from your email, or request a new reset from the login page.</p>
          <Link href="/forgot-password" className={`${authLinkClass} mt-6 inline-block`}>
            Forgot password
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? `Reset failed (${res.status})`);
        setBusy(false);
        return;
      }
      router.replace("/login?reset=ok");
      router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <div className={authCardClass}>
      <AuthBranding title="Set new password" />
      <p className="mt-2 text-center text-xs text-zinc-500">Choose a strong password (at least 8 characters).</p>
      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <label className="block text-xs text-zinc-400">
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authFieldClass}
            required
            minLength={8}
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authFieldClass}
            required
            minLength={8}
          />
        </label>
        {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className={authPrimaryButtonClass}
        >
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500">
        <Link href="/login" className={authLinkClass}>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthPageSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
