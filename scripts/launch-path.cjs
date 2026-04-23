#!/usr/bin/env node
/**
 * Single entry point for “do everything possible” toward production launch.
 *
 * Order:
 *   1) npm run release:check     (lint + test + build + production smoke against LAUNCH_SMOKE_URL)
 *   2) npm run finish:billing      (local .env completeness — needs BBGPT_APP_PASSWORD or legacy key)
 *   3) npm run vercel:env:prod    (push .env.local → Vercel Production; needs Vercel CLI auth)
 *   4) npm run deploy:prod        (omit with --no-deploy)
 *   5) npm run launch:smoke       (again, after deploy)
 *
 * Flags:
 *   --no-deploy     Skip deploy:prod (only env push + smoke)
 *   --smoke-only    Only run launch:smoke (use after you fixed env elsewhere)
 *
 * Usage: npm run launch:path
 */
const { execSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const argv = process.argv.slice(2);
const noDeploy = argv.includes("--no-deploy");
const smokeOnly = argv.includes("--smoke-only");

function sh(cmd) {
  console.log(`\n────────────────────────────────────────\n> ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", shell: true, cwd: ROOT });
}

function shTry(cmd) {
  try {
    sh(cmd);
    return true;
  } catch {
    return false;
  }
}

console.log(`
╔════════════════════════════════════════════════════════════╗
║  bbGPT — launch path (automated steps + manual handoff)   ║
╚════════════════════════════════════════════════════════════╝
`);

if (smokeOnly) {
  sh("npm run launch:smoke");
  process.exit(0);
}

// 1) Quality + live smoke (default URL: https://postforge2.vercel.app)
if (!shTry("npm run release:check")) {
  console.log(`
┌─ BLOCKED ─────────────────────────────────────────────────
│  Fix the error above (lint / tests / build), then re-run:
│    npm run launch:path
└───────────────────────────────────────────────────────────
`);
  process.exit(1);
}

// 2) Local env completeness for billing + gate push script
if (!shTry("npm run finish:billing")) {
  console.log(`
┌─ BLOCKED — add gate password to .env.local ─────────────────────────────
│  The env sync script needs this line on disk (never committed):
│    BBGPT_APP_PASSWORD=<same password as production sign-in>
│  Legacy name also works:
│    BABYGPT_APP_PASSWORD=<same password>
│
│  Steps:
│    1. Open:  ${path.join(ROOT, ".env.local")}  (create from .env.local.example if needed)
│    2. Paste one of the lines above with your real password.
│    3. Save.
│    4. Run:    npm run finish:billing          (must exit 0)
│    5. Run:    npm run launch:path
│
│  If the password ONLY exists in Vercel today (not in .env.local):
│    • Either copy it into .env.local so scripts can sync, OR
│    • Skip sync: open Vercel → postforge2 → Settings → Environment Variables
│      and confirm BBGPT_APP_PASSWORD (or BABYGPT_APP_PASSWORD) is set for Production.
└───────────────────────────────────────────────────────────────────────────
`);
  process.exit(1);
}

// 3) Push env to Vercel Production
if (!shTry("npm run vercel:env:prod")) {
  console.log(`
┌─ BLOCKED — Vercel env push failed ───────────────────────────────────────
│  Common fixes:
│    • npx vercel login
│    • Repo linked:  npx vercel link   (creates .vercel/project.json)
│    • Team scope: ensure CLI uses the same team as the project.
│
│  Manual fallback (same outcome as the script):
│    Vercel Dashboard → postforge2 → Settings → Environment Variables → Production
│    Copy each key/value from .env.local (never share values in chat).
└───────────────────────────────────────────────────────────────────────────
`);
  process.exit(1);
}

// 4) Deploy production build
if (!noDeploy) {
  sh("npm run deploy:prod");
} else {
  console.log("\n[--no-deploy] Skipped npm run deploy:prod\n");
}

// 5) Smoke test again (post-deploy)
sh("npm run launch:smoke");

console.log(`
╔════════════════════════════════════════════════════════════╗
║  Automated launch path finished OK.                       ║
╚════════════════════════════════════════════════════════════╝

You still complete (human / dashboards):
  • Browser: ${process.env.LAUNCH_SMOKE_URL?.replace(/\/$/, "") || "https://postforge2.vercel.app"}/login → sign in → send one chat message (needs LLM keys on Vercel).
  • Stripe: Webhook URL …/api/stripe/webhook → send test event → 200.
  • Vercel: NEXT_PUBLIC_APP_URL matches your public URL (no trailing slash).
  • Optional custom domain: Vercel → Domains, then update NEXT_PUBLIC_APP_URL.

Docs: npm run online:steps   ·   deploy/CANNOT-AUTOMATE.md
`);
