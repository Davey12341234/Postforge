#!/usr/bin/env node
/**
 * Push bbGPT + Stripe env from .env.local (or .env) to Vercel Production.
 * Uses spawnSync with argv (no shell) so secrets with special chars never hang like nested PowerShell.
 *
 * Requires: .vercel/project.json (npx vercel link), npx vercel CLI auth.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { parseEnvFile } = require("./load-env-files.cjs");

const repoRoot = path.join(__dirname, "..");

function resolveEnvPath() {
  const local = path.join(repoRoot, ".env.local");
  const plain = path.join(repoRoot, ".env");
  if (fs.existsSync(local)) return local;
  if (fs.existsSync(plain)) return plain;
  throw new Error("Create repo-root .env.local or .env with bbGPT + Stripe keys.");
}

function vercelEnvAdd(name, value, sensitive) {
  const bin = process.platform === "win32" ? "npx.cmd" : "npx";
  const args = ["vercel@latest", "env", "add", name, "production", "--yes", "--force"];
  if (sensitive) args.push("--sensitive");
  args.push("--value", value);
  const r = spawnSync(bin, args, {
    cwd: repoRoot,
    // Ignore stdin — Vercel CLI + npx sometimes wait for stdin and never exit on Windows.
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, CI: "true", VERCEL_TELEMETRY_DISABLED: "1" },
    shell: process.platform === "win32",
  });
  if (r.status !== 0 && r.status !== null) {
    throw new Error(`vercel env add failed for ${name} (exit ${r.status})`);
  }
  if (r.error) throw r.error;
}

function main() {
  if (!fs.existsSync(path.join(repoRoot, ".vercel", "project.json"))) {
    throw new Error("Missing .vercel/project.json — run: npx vercel link");
  }

  const envPath = resolveEnvPath();
  console.error(`Using env file (merged with .env if present): ${envPath}\n`);

  const env = {
    ...parseEnvFile(path.join(repoRoot, ".env")),
    ...parseEnvFile(path.join(repoRoot, ".env.local")),
  };

  const required = [
    { key: "BBGPT_APP_PASSWORD", legacy: "BABYGPT_APP_PASSWORD", sensitive: true },
    { key: "BBGPT_SESSION_SECRET", legacy: "BABYGPT_SESSION_SECRET", sensitive: true },
    { key: "STRIPE_SECRET_KEY", sensitive: true },
    { key: "STRIPE_WEBHOOK_SECRET", sensitive: true },
    { key: "STRIPE_PRICE_STARTER", sensitive: false },
    { key: "STRIPE_PRICE_PRO", sensitive: false },
    { key: "STRIPE_PRICE_TEAM", sensitive: false },
    { key: "NEXT_PUBLIC_APP_URL", sensitive: false },
  ];

  for (const { key, sensitive, legacy } of required) {
    let v = env[key]?.trim();
    if (!v && legacy) v = env[legacy]?.trim();
    if (!v) throw new Error(`Missing ${key} in env file${legacy ? ` (or legacy ${legacy})` : ""}`);
    console.error(`Setting ${key} ...`);
    vercelEnvAdd(key, v, sensitive);
  }

  const optionalPrices = [
    "NEXT_PUBLIC_PLAN_PRICE_STARTER_USD",
    "NEXT_PUBLIC_PLAN_PRICE_PRO_USD",
    "NEXT_PUBLIC_PLAN_PRICE_TEAM_USD",
  ];
  const optionalYearlyUsd = [
    "NEXT_PUBLIC_PLAN_PRICE_STARTER_YEARLY_USD",
    "NEXT_PUBLIC_PLAN_PRICE_PRO_YEARLY_USD",
    "NEXT_PUBLIC_PLAN_PRICE_TEAM_YEARLY_USD",
  ];
  const optionalYearlyStripe = [
    "STRIPE_PRICE_STARTER_YEARLY",
    "STRIPE_PRICE_PRO_YEARLY",
    "STRIPE_PRICE_TEAM_YEARLY",
  ];
  const optionalLlm = [
    { key: "Z_AI_API_KEY", sensitive: true },
    { key: "OPENAI_API_KEY", sensitive: true },
    { key: "GEMINI_API_KEY", sensitive: true },
  ];

  for (const key of optionalPrices) {
    const v = env[key]?.trim();
    if (!v) {
      console.error(`Skipping optional ${key}`);
      continue;
    }
    console.error(`Setting ${key} ...`);
    vercelEnvAdd(key, v, false);
  }

  for (const key of optionalYearlyUsd) {
    const v = env[key]?.trim();
    if (!v) {
      console.error(`Skipping optional ${key}`);
      continue;
    }
    console.error(`Setting ${key} ...`);
    vercelEnvAdd(key, v, false);
  }

  for (const key of optionalYearlyStripe) {
    const v = env[key]?.trim();
    if (!v) {
      console.error(`Skipping optional ${key}`);
      continue;
    }
    console.error(`Setting ${key} ...`);
    vercelEnvAdd(key, v, false);
  }

  for (const { key, sensitive } of optionalLlm) {
    const v = env[key]?.trim();
    if (!v) {
      console.error(`Skipping optional ${key}`);
      continue;
    }
    console.error(`Setting ${key} ...`);
    vercelEnvAdd(key, v, sensitive);
  }

  console.error("\nDone. Redeploy: npx vercel deploy --prod --yes\n");
}

main();
