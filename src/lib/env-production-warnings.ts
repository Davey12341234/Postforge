/**
 * Logs clear misconfiguration warnings in production (e.g. Railway).
 * Does not throw — fix Variables and redeploy.
 */

function looksIncompleteStripe(v: string): boolean {
  const s = v.trim();
  return s.includes("...") || /^pk_test_\.{3}$|^sk_test_\.{3}$|^whsec_\.{3}$/.test(s);
}

export function logProductionEnvWarnings(): void {
  if (process.env.NODE_ENV !== "production") return;

  const onRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_DEPLOYMENT_ID,
  );
  if (!onRailway) return;

  const issues: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    issues.push(
      "DATABASE_URL is missing on this service — add it (e.g. Railway reference to Postgres DATABASE_URL).",
    );
  }

  const authUrl = process.env.NEXTAUTH_URL ?? "";
  if (!authUrl || authUrl.includes("YOUR_DOMAIN_HERE")) {
    issues.push(
      "NEXTAUTH_URL is missing or still YOUR_DOMAIN_HERE — set it to https://<your-app>.up.railway.app (root URL, no /unified).",
    );
  } else if (!authUrl.startsWith("https://")) {
    issues.push("NEXTAUTH_URL must use https:// in production.");
  }

  const authSecret = process.env.NEXTAUTH_SECRET ?? "";
  if (
    !authSecret ||
    /GENERATE_WITH|openssl_rand|changeme/i.test(authSecret) ||
    authSecret.length < 16
  ) {
    issues.push(
      "NEXTAUTH_SECRET must be a long random string (e.g. openssl rand -base64 32), not placeholder text.",
    );
  }

  const admin = process.env.ADMIN_REVENUE_SECRET ?? "";
  if (admin === "random-long-string" || (admin && admin.length < 16)) {
    issues.push(
      'ADMIN_REVENUE_SECRET must be a strong random string — not the literal "random-long-string".',
    );
  }

  if (process.env.REDIS_URL?.includes("localhost")) {
    issues.push(
      "REDIS_URL points at localhost — PostForge uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for Redis. Remove REDIS_URL or set Upstash vars.",
    );
  }

  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"] as const) {
    const v = process.env[key];
    if (v && looksIncompleteStripe(v)) {
      issues.push(`${key} looks like a placeholder (contains ...). Paste the full key from Stripe.`);
    }
  }

  for (const key of ["STRIPE_PRICE_PRO", "STRIPE_PRICE_BUSINESS", "STRIPE_PRICE_ENTERPRISE"] as const) {
    const v = process.env[key]?.trim() ?? "";
    if (v && (!v.startsWith("price_") || v.includes("..."))) {
      issues.push(`${key} must be a real Stripe Price ID (price_...) from the Dashboard.`);
    }
  }

  for (const line of issues) {
    console.error(`[postforge] ENV: ${line}`);
  }
}
