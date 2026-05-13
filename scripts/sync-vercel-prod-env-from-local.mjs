#!/usr/bin/env node
/**
 * Removes then re-adds selected Production env vars from .env.local values
 * (stdin → vercel env add) to avoid newline / shell mangling.
 *
 * Gemini (when GEMINI_API_KEY is non-empty in .env.local):
 *   GEMINI_API_KEY (sensitive), GEMINI_CHAT_MODEL, GEMINI_IMAGE_MODEL
 *   Defaults if omitted: gemini-2.5-flash / gemini-3.1-flash-image-preview
 *
 * Stripe Checkout payment methods (always synced from .env.local):
 *   STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES — default "card"; use "card,link" only if Link is enabled in Stripe Dashboard
 *
 * If GEMINI_API_KEY is missing, GEMINI_* keys are skipped (existing Vercel Gemini vars unchanged).
 *
 * Usage: npm run sync:vercel-env   or   node scripts/sync-vercel-prod-env-from-local.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envLocalPath = join(root, ".env.local");

const ALL_NAMES = [
  "BBGPT_USER_AUTH",
  "NEXT_PUBLIC_BBGPT_USER_AUTH",
  "BBGPT_SESSION_SECRET",
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GEMINI_CHAT_MODEL",
  "GEMINI_IMAGE_MODEL",
  "STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "NEXT_PUBLIC_APP_URL",
];

const GEMINI_KEYS = ["GEMINI_API_KEY", "GEMINI_CHAT_MODEL", "GEMINI_IMAGE_MODEL"];

function parseDotEnv(content) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function vercelRm(name) {
  const r = spawnSync("npx", ["vercel", "env", "rm", name, "production", "--yes"], {
    cwd: root,
    encoding: "utf-8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = (r.stdout || "") + (r.stderr || "");
  if (r.status !== 0 && !out.includes("env_not_found") && !out.includes("was not found")) {
    console.warn(`[rm ${name}] exit ${r.status}\n${out}`);
  }
}

/**
 * @param {string} name
 * @param {string} value no trailing newline
 * @param {{ sensitive?: boolean }} opts
 */
function vercelAdd(name, value, { sensitive = false } = {}) {
  const args = ["vercel", "env", "add", name, "production", "--yes", "--force"];
  if (sensitive) args.push("--sensitive");
  const r = spawnSync("npx", args, {
    cwd: root,
    input: value,
    encoding: "utf-8",
    shell: true,
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (r.status !== 0) {
    console.error(`Failed to add ${name}`);
    process.exit(1);
  }
}

if (!existsSync(envLocalPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const raw = readFileSync(envLocalPath, "utf8");
const parsed = parseDotEnv(raw);

const missing = [];
for (const k of ["DATABASE_URL", "BBGPT_SESSION_SECRET", "OPENAI_API_KEY"]) {
  if (!parsed[k]?.trim()) missing.push(k);
}
if (missing.length) {
  console.error(`Missing required keys in .env.local (non-empty): ${missing.join(", ")}`);
  process.exit(1);
}

const skipResend = !parsed.RESEND_API_KEY?.trim();
if (skipResend) {
  console.warn(
    "RESEND_API_KEY not set in .env.local — skipping remove/add for RESEND_API_KEY (Vercel value unchanged).",
  );
}

const skipGemini = !parsed.GEMINI_API_KEY?.trim();
if (skipGemini) {
  console.warn(
    "GEMINI_API_KEY not set in .env.local — skipping remove/add for GEMINI_* keys (Vercel Gemini env unchanged).",
  );
}

/** Final values: overrides per product rules */
const values = {
  BBGPT_USER_AUTH: "1",
  NEXT_PUBLIC_BBGPT_USER_AUTH: "1",
  BBGPT_SESSION_SECRET: parsed.BBGPT_SESSION_SECRET.trim(),
  DATABASE_URL: parsed.DATABASE_URL.trim(),
  OPENAI_API_KEY: parsed.OPENAI_API_KEY.trim(),
  GEMINI_API_KEY: parsed.GEMINI_API_KEY?.trim() ?? "",
  GEMINI_CHAT_MODEL: parsed.GEMINI_CHAT_MODEL?.trim() || "gemini-2.5-flash",
  GEMINI_IMAGE_MODEL: parsed.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image-preview",
  STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES: parsed.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES?.trim() || "card",
  RESEND_API_KEY: parsed.RESEND_API_KEY?.trim() ?? "",
  EMAIL_FROM: "onboarding@resend.dev",
  NEXT_PUBLIC_APP_URL: "https://www.bbgpt.ai",
};

const sensitive = new Set([
  "BBGPT_SESSION_SECRET",
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
]);

let NAMES = [...ALL_NAMES];
if (skipResend) NAMES = NAMES.filter((n) => n !== "RESEND_API_KEY");
if (skipGemini) NAMES = NAMES.filter((n) => !GEMINI_KEYS.includes(n));

console.log("Removing existing Production keys (ignore not-found)…");
for (const name of NAMES) {
  vercelRm(name);
}

console.log("Adding clean values…");
for (const name of NAMES) {
  const v = values[name];
  if (!v) {
    console.error(`Internal error: no value for ${name}`);
    process.exit(1);
  }
  console.log(`  + ${name}${sensitive.has(name) ? " (sensitive)" : ""}`);
  vercelAdd(name, v, { sensitive: sensitive.has(name) });
}

console.log("Done. Run: npx vercel env ls production");
