#!/usr/bin/env node
/**
 * Pre-launch smoke test against a deployed bbGPT URL (default: Vercel production).
 * No secrets. Safe in CI.
 *
 * Usage:
 *   npm run launch:smoke
 *   LAUNCH_SMOKE_URL=https://your.domain npm run launch:smoke
 */
const BASE = (process.env.LAUNCH_SMOKE_URL || "https://postforge2.vercel.app").replace(/\/$/, "");

function passIcon(ok) {
  return ok ? "✅" : "❌";
}

async function main() {
  console.log(`\n=== bbGPT — production launch smoke test ===\nTarget: ${BASE}\n`);

  let failed = false;

  // 1) App entry (follows redirect to /login when gate is on)
  const home = await fetch(`${BASE}/`, { redirect: "follow" });
  const homeOk = home.ok;
  if (!homeOk) failed = true;
  console.log(
    `${passIcon(homeOk)} GET / → ${home.status} (final: ${home.url.split("?")[0]})`,
  );

  // 2) Login (required surface for gated deploy; static for ungated)
  const login = await fetch(`${BASE}/login`, { redirect: "follow" });
  const loginOk = login.ok;
  if (!loginOk) failed = true;
  const loginText = loginOk ? await login.text() : "";
  const loginHasBrand =
    loginText.includes("bbgpt-logo") || loginText.includes("bbGPT") || loginText.includes("bbgpt");
  if (!loginHasBrand) failed = true;
  console.log(`${passIcon(loginOk)} GET /login → ${login.status}`);
  console.log(`${passIcon(loginHasBrand)} Login page HTML includes bbGPT / logo reference`);

  // 3) Public logo (bypasses auth in middleware)
  const logo = await fetch(`${BASE}/bbgpt-logo.png`, { redirect: "follow" });
  const logoOk = logo.ok && (logo.headers.get("content-type") || "").includes("image");
  if (!logoOk) failed = true;
  console.log(`${passIcon(logoOk)} GET /bbgpt-logo.png → ${logo.status} (${logo.headers.get("content-type") || "no ctype"})`);

  // 4) Credits API — 200 when gate off; 401 when gate on without cookie (both OK)
  const credits = await fetch(`${BASE}/api/credits`, { redirect: "follow" });
  const creditsOk = credits.status === 200 || credits.status === 401;
  if (!creditsOk) failed = true;
  const creditsNote =
    credits.status === 401
      ? "gate on (no session — expected)"
      : credits.status === 200
        ? "reachable"
        : "";
  console.log(`${passIcon(creditsOk)} GET /api/credits → ${credits.status} ${creditsNote ? `(${creditsNote})` : ""}`);

  // 5) Checkout return page exists (Stripe redirect target)
  const ret = await fetch(`${BASE}/checkout/return`, { redirect: "follow" });
  const retOk = ret.ok;
  if (!retOk) failed = true;
  console.log(`${passIcon(retOk)} GET /checkout/return → ${ret.status}`);

  if (failed) {
    console.log("\n❌ Smoke test FAILED — fix deployment or URL before launch.\n");
    process.exit(1);
  }

  console.log(`
✅ Automated smoke test passed.

Manual launch checks (your accounts):
  • Sign in at ${BASE}/login → open chat → send one message (LLM keys on Vercel).
  • Plans modal → Stripe Checkout (test mode if sk_test_…).
  • Stripe Dashboard → Webhook → POST ${BASE}/api/stripe/webhook → 200 on test event.
  • NEXT_PUBLIC_APP_URL on Vercel matches this host for Checkout return URLs.

`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
