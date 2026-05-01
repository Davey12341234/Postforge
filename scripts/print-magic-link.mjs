#!/usr/bin/env node
/**
 * Prints a one-time sign-in URL (magic link) for an allowed email without sending email.
 * Requires BBGPT_SESSION_SECRET (same as production) and optional DATABASE_URL for policy checks.
 *
 * Usage:
 *   node scripts/print-magic-link.mjs you@gmail.com https://www.bbgpt.ai
 *
 * Open the printed URL in a browser while logged out to receive the session cookie.
 */
import { createRequire } from "module";
import { SignJWT } from "jose";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { loadMergedEnv } = require("./load-env-files.cjs");

const PURPOSE = "magic_login";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = loadMergedEnv(root);
for (const [k, v] of Object.entries(env)) {
  if (typeof v === "string" && v.length > 0) process.env[k] = v;
}

const email = normalizeEmail(process.argv[2]);
const base = (process.argv[3] || "http://127.0.0.1:3000").replace(/\/$/, "");

function normalizeEmail(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  return s || null;
}

const secret = process.env.BBGPT_SESSION_SECRET?.trim() || process.env.BABYGPT_SESSION_SECRET?.trim();
if (!secret) {
  console.error("Missing BBGPT_SESSION_SECRET in .env / .env.local");
  process.exit(1);
}

if (!email) {
  console.error("Usage: node scripts/print-magic-link.mjs <email> [base-url]");
  process.exit(1);
}

const key = new TextEncoder().encode(secret);
const token = await new SignJWT({ purpose: PURPOSE, sub: "default", email })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("15m")
  .sign(key);

const url = `${base}/api/auth/magic?token=${encodeURIComponent(token)}`;
console.log("\nOpen this URL in your browser (within 15 minutes), logged out:\n");
console.log(url);
console.log("\n");
