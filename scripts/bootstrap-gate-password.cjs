#!/usr/bin/env node
/**
 * If merged env has no gate password, generates one, appends BBGPT_APP_PASSWORD to .env.local,
 * and pushes it to Vercel Production (same mechanism as vercel-push-prod-env.cjs).
 * Safe to run multiple times — skips when a password is already loaded from env files.
 */
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { loadMergedEnv } = require("./load-env-files.cjs");

const ROOT = path.join(__dirname, "..");

function gateOk(env) {
  const p = env.BBGPT_APP_PASSWORD ?? env.BABYGPT_APP_PASSWORD;
  return p != null && String(p).trim() !== "";
}

function vercelEnvAdd(name, value, sensitive) {
  const bin = process.platform === "win32" ? "npx.cmd" : "npx";
  const args = ["vercel@latest", "env", "add", name, "production", "--yes", "--force"];
  if (sensitive) args.push("--sensitive");
  args.push("--value", value);
  const r = spawnSync(bin, args, {
    cwd: ROOT,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, CI: "true", VERCEL_TELEMETRY_DISABLED: "1" },
    shell: process.platform === "win32",
  });
  if (r.status !== 0 && r.status !== null) throw new Error(`vercel env add failed for ${name}`);
}

function main() {
  const env = loadMergedEnv(ROOT);
  if (gateOk(env)) {
    console.error("Gate password already configured in merged env — skipping bootstrap.");
    process.exit(0);
  }

  const pw = crypto.randomBytes(24).toString("base64url");
  const localPath = path.join(ROOT, ".env.local");

  fs.appendFileSync(
    localPath,
    `\n# Auto-added by scripts/bootstrap-gate-password.cjs — shared /login password\nBBGPT_APP_PASSWORD=${pw}\n`,
  );

  console.error("Wrote BBGPT_APP_PASSWORD to .env.local (gitignored).\nSetting Vercel Production...");
  vercelEnvAdd("BBGPT_APP_PASSWORD", pw, true);
  console.error("Done. Sign in at /login with the password stored in .env.local only.\n");
}

main();
