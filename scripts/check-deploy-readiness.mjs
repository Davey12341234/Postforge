#!/usr/bin/env node
/**
 * Validates that all production env vars are present before deploy.
 *
 * Usage:
 *   1. Copy your Railway variables into deploy/secrets.preview.env (KEY=value per line, gitignored)
 *   2. npm run deploy:check
 *
 * Or pass a file:
 *   node scripts/check-deploy-readiness.mjs --file=.env.production.local
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
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

function loadEnvSpec() {
  const j = JSON.parse(
    readFileSync(join(__dirname, "required-env.production.json"), "utf8"),
  );
  return {
    required: Array.isArray(j.required) ? j.required : [],
    recommended: Array.isArray(j.recommended) ? j.recommended : [],
  };
}

function main() {
  const args = process.argv.slice(2);
  let fileArg = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--file=")) {
      fileArg = args[i].slice("--file=".length);
    }
  }

  const candidates = [
    fileArg,
    join(process.cwd(), "deploy", "secrets.preview.env"),
    join(process.cwd(), ".env.production.local"),
  ].filter(Boolean);

  let pathUsed = null;
  let env = {};
  for (const p of candidates) {
    const full = p.startsWith("/") || /^[A-Za-z]:\\/.test(p) ? p : join(process.cwd(), p);
    if (existsSync(full)) {
      pathUsed = full;
      env = parseEnvFile(readFileSync(full, "utf8"));
      break;
    }
  }

  const { required, recommended } = loadEnvSpec();
  const missing = [];
  const empty = [];
  const bad = [];

  for (const key of required) {
    if (!(key in env) || env[key] === undefined) {
      missing.push(key);
      continue;
    }
    const v = String(env[key]).trim();
    if (!v) {
      empty.push(key);
      continue;
    }
    if (key === "NEXTAUTH_URL") {
      if (!/^https:\/\//.test(v)) {
        bad.push(`${key} must start with https://`);
      }
      if (v.endsWith("/")) {
        bad.push(`${key} should not end with /`);
      }
    }
    if (key.startsWith("STRIPE_PRICE_") && !v.startsWith("price_")) {
      bad.push(`${key} should look like price_... (Stripe Price ID)`);
    }
    if (key.startsWith("STRIPE_PRICE_") && v.includes("...")) {
      bad.push(`${key} must be a real price ID from Stripe, not price_...`);
    }
    if (key === "NEXTAUTH_SECRET" && /GENERATE_WITH|openssl_rand|changeme/i.test(v)) {
      bad.push(`${key} must be a real random string, not placeholder instructions`);
    }
    if (key === "NEXTAUTH_URL" && v.includes("YOUR_DOMAIN_HERE")) {
      bad.push(`${key} must be your real public https URL`);
    }
    if (key === "ADMIN_REVENUE_SECRET" && v === "random-long-string") {
      bad.push(`${key} must be a real random secret, not the literal "random-long-string"`);
    }
    if (key === "DATABASE_URL" && !/^postgres(ql)?:\/\//i.test(v) && !v.includes("${{")) {
      bad.push(
        `${key} must be a postgresql://... URL or Railway reference like \${{ Postgres.DATABASE_URL }}`,
      );
    }
    if (
      (key === "STRIPE_SECRET_KEY" || key === "STRIPE_PUBLISHABLE_KEY" || key === "STRIPE_WEBHOOK_SECRET") &&
      v.includes("...")
    ) {
      bad.push(`${key} looks incomplete (contains ...)`);
    }
  }

  console.log("\n=== PostForge — deploy readiness check ===\n");
  if (!pathUsed) {
    console.log("No env file found.\n");
    console.log("Do one of the following:\n");
    console.log(
      "  1) Create  deploy/secrets.preview.env  (copy-paste KEY=value from Railway, one per line)",
    );
    console.log("  2) Or use  .env.production.local  with the same format");
    console.log("  3) Or run:  node scripts/check-deploy-readiness.mjs --file=path/to/env\n");
    console.log("Required keys are listed in: scripts/required-env.production.json\n");
    process.exit(1);
  }

  console.log(`Using file: ${pathUsed}\n`);

  let ok = true;
  for (const key of required) {
    const v = env[key];
    const present = v !== undefined && String(v).trim() !== "";
    console.log(`  ${present ? "✓" : "✗"} ${key}`);
    if (!present) ok = false;
  }

  if (missing.length) {
    console.log("\nMissing keys:", missing.join(", "));
    ok = false;
  }
  if (empty.length) {
    console.log("\nEmpty values:", empty.join(", "));
    ok = false;
  }
  if (bad.length) {
    console.log("\nFix these:");
    for (const b of bad) console.log(`  - ${b}`);
    ok = false;
  }

  if (!ok) {
    console.log("\nFix the file and run: npm run deploy:check\n");
    process.exit(1);
  }

  const recMissing = [];
  for (const key of recommended) {
    const v = env[key];
    if (v === undefined || String(v).trim() === "") {
      recMissing.push(key);
    }
  }
  if (recMissing.length) {
    console.log("\nRecommended (set in Railway for full Unified features):");
    for (const key of recommended) {
      const present = env[key] !== undefined && String(env[key]).trim() !== "";
      console.log(`  ${present ? "✓" : "○"} ${key}${present ? "" : " — see scripts/required-env.production.json notes"}`);
    }
    console.log(
      "\nDeploy can proceed without these, but image gen (OpenAI), voice, or absolute upload URLs may fail until set.\n",
    );
  } else {
    console.log("\nRecommended variables are also set.\n");
  }

  console.log("All required variables are set. Safe to deploy.\n");
  process.exit(0);
}

main();
