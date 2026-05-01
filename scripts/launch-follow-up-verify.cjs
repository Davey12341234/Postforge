#!/usr/bin/env node
/**
 * Follow-up launch checks (no secrets printed):
 * - POST /api/auth/login on production with merged env password
 * - GET /api/credits with session cookie (expects 200 + source when gate on)
 *
 * LAUNCH_SMOKE_URL=https://your.domain npm run launch:follow-up
 */
const path = require("path");
const { parseEnvFile } = require("./load-env-files.cjs");

const ROOT = path.join(__dirname, "..");

/** Same merge as vercel-push-prod-env.cjs — ignore process.env so shell vars cannot override .env.local. */
function mergeEnvFiles() {
  return {
    ...parseEnvFile(path.join(ROOT, ".env")),
    ...parseEnvFile(path.join(ROOT, ".env.local")),
  };
}
const BASE = (process.env.LAUNCH_SMOKE_URL || "https://postforge2.vercel.app").replace(/\/$/, "");

function extractSessionCookie(res) {
  const headers = res.headers;
  if (typeof headers.getSetCookie === "function") {
    for (const c of headers.getSetCookie()) {
      const m = c.match(/^bbgpt_token=([^;]+)/);
      if (m) return `bbgpt_token=${m[1]}`;
      const m2 = c.match(/^babygpt_token=([^;]+)/);
      if (m2) return `babygpt_token=${m2[1]}`;
    }
  }
  const raw = headers.get("set-cookie");
  if (!raw) return "";
  const part = raw.split(",").find((s) => /bbgpt_token=|babygpt_token=/.test(s));
  if (!part) return "";
  const m = part.match(/(?:bbgpt_token|babygpt_token)=([^;]+)/);
  return m ? `${m[0].split("=")[0]}=${m[1]}` : "";
}

async function main() {
  const env = mergeEnvFiles();
  const pw = env.BBGPT_APP_PASSWORD ?? env.BABYGPT_APP_PASSWORD;
  if (!pw || !String(pw).trim()) {
    console.error("❌ No BBGPT_APP_PASSWORD or BABYGPT_APP_PASSWORD in merged .env / .env.local.");
    process.exit(1);
  }

  console.error(`Target: ${BASE}\n`);

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: String(pw).trim() }),
  });

  if (!loginRes.ok) {
    const err = (await loginRes.json().catch(() => ({}))).error ?? "";
    console.error(`❌ Login HTTP ${loginRes.status}${err ? ` — ${err}` : ""}`);
    console.error("   If password fails: align .env.local with Vercel Production BBGPT_APP_PASSWORD.");
    process.exit(1);
  }

  const cookie = extractSessionCookie(loginRes);
  if (!cookie) {
    console.error("❌ Login OK but no bbgpt_token Set-Cookie — unexpected.");
    process.exit(1);
  }

  console.error("✅ Login accepted; session cookie received.");

  const creditsRes = await fetch(`${BASE}/api/credits`, {
    headers: { Cookie: cookie },
    credentials: "omit",
  });

  if (creditsRes.status !== 200) {
    console.error(`❌ GET /api/credits → HTTP ${creditsRes.status} (expected 200 with session)`);
    process.exit(1);
  }

  const body = await creditsRes.json().catch(() => ({}));
  const src = body.source;
  const stripeOk = body.stripe && typeof body.stripe.configured === "boolean";
  console.error(`✅ GET /api/credits → 200 (source: ${src ?? "?"})`);
  if (stripeOk) {
    console.error(`   stripe.configured: ${body.stripe.configured}`);
  }

  console.error("\n✅ Follow-up API checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
