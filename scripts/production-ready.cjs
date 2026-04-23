#!/usr/bin/env node
/**
 * Runs lint, tests, production build, then billing env completeness (finish:billing).
 * Does not read secret values — only exit codes.
 *
 * Usage: npm run prod:ready
 */
const { execSync } = require("child_process");

function run(label, cmd) {
  console.log(`\n--- ${label} ---\n`);
  try {
    execSync(cmd, { stdio: "inherit", shell: true, cwd: process.cwd() });
    return true;
  } catch {
    return false;
  }
}

console.log("\n=== bbGPT — production readiness (automated) ===\n");

const steps = [
  ["ESLint", "npm run lint"],
  ["Vitest", "npm run test"],
  ["Next.js production build", "npm run build"],
  ["Billing / gate env (npm run finish:billing)", "npm run finish:billing"],
];

let failed = false;
for (const [label, cmd] of steps) {
  if (!run(label, cmd)) failed = true;
}

if (failed) {
  console.log("\n---\n");
  console.log("One or more steps failed. Typical fixes:");
  console.log("  - Code: fix lint/test/build errors shown above.");
  console.log("  - Billing: add missing keys to .env.local (see .env.local.example).");
  console.log("    Stripe secrets come only from your Stripe Dashboard — they cannot be generated here.");
  console.log("    If every key shows missing after `vercel env pull`, verify values in Vercel Dashboard (pull often leaves secrets blank locally).");
  console.log("  - Deploy smoke + DB without fixing local secrets:  npm run launch:audit");
  console.log("  - Operator checklist for you + AI: deploy/LAUNCH-HANDOFF.md");
  console.log("  - Outline of human-only steps: deploy/CANNOT-AUTOMATE.md");
  console.log("  - Docs: docs/STRIPE-ACCOUNT-SETUP.md, docs/FINAL-LAUNCH-COPY.md\n");
  process.exit(1);
}

console.log("\n=== All automated checks passed ===\n");
console.log("See deploy/CANNOT-AUTOMATE.md for what still requires your accounts.");
console.log("Next steps (operator):");
console.log("  1) npm run vercel:env:prod     # push .env.local to Vercel Production");
console.log("  2) npm run deploy:prod           # or: npm run deploy:prod:fresh (no build cache)");
console.log("  3) Smoke-test: login → Plans → Checkout → Stripe webhook 200\n");
process.exit(0);
