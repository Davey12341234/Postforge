#!/usr/bin/env node
/**
 * Runs a command with `vercel env run -e production` while temporarily renaming
 * `.env.local` and `.env` aside. Vercel CLI merges those files over downloaded
 * secrets — empty strings like DATABASE_URL="" wipe Production DATABASE_URL, and
 * a stale `DATABASE_URL` in `.env` overrides the correct Production URL.
 *
 * Usage: node scripts/run-vercel-prod-db.mjs npm run db:ping
 *        node scripts/run-vercel-prod-db.mjs npm run db:migrate
 */
import { existsSync, renameSync } from "fs";
import { dirname, join } from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = join(root, ".env.local");
const envDot = join(root, ".env");
const stashLocal = join(root, `.env.local.vercel-prod-stash-${process.pid}`);
const stashDot = join(root, `.env.vercel-prod-stash-${process.pid}`);

const rest = process.argv.slice(2);
if (rest.length === 0) {
  console.error("Usage: node scripts/run-vercel-prod-db.mjs <command> [args...]");
  console.error("Example: node scripts/run-vercel-prod-db.mjs npm run db:ping");
  process.exit(1);
}

let stashedLocal = false;
if (existsSync(envLocal)) {
  renameSync(envLocal, stashLocal);
  stashedLocal = true;
}

let stashedDot = false;
if (existsSync(envDot)) {
  renameSync(envDot, stashDot);
  stashedDot = true;
}

function restore() {
  if (stashedLocal && existsSync(stashLocal)) {
    renameSync(stashLocal, envLocal);
  }
  if (stashedDot && existsSync(stashDot)) {
    renameSync(stashDot, envDot);
  }
}

const bin = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["vercel", "env", "run", "--environment", "production", "--", ...rest];
/** @type {number} */
let status = 1;
try {
  const r = spawnSync(bin, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, CI: "true", VERCEL_TELEMETRY_DISABLED: "1" },
  });
  status = typeof r.status === "number" ? r.status : 1;
} finally {
  restore();
}

process.exit(status);
