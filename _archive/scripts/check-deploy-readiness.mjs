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
 *   node scripts/check-deploy-readiness.mjs --file path/to.env
 *
 * If your editor hides gitignored paths, use either:
 *   - set DEPLOY_CHECK_FILE to an absolute path (any folder), or
 *   - put secrets in  %USERPROFILE%\.postforge-deploy-check.env  (Windows)
 *     or  ~/.postforge-deploy-check.env  (macOS/Linux) — outside the repo, easy to open.
 */

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve a path for reading; relative paths are from cwd. */
function resolveEnvFilePath(p) {
  if (!p || typeof p !== "string") return null;
  const t = p.trim();
  if (!t) return null;
  if (t.startsWith("/") || /^[A-Za-z]:[\\/]/.test(t)) {
    return t;
  }
  return join(process.cwd(), t);
}

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
    const a = args[i];
    if (a === "--file" && args[i + 1]) {
      fileArg = args[++i];
    } else if (a.startsWith("--file=")) {
      fileArg = a.slice("--file=".length);
    }
  }

  const envFromVar =
    process.env.DEPLOY_CHECK_FILE ||
    process.env.POSTFORGE_DEPLOY_CHECK_FILE ||
    process.env.POSTFORGE_SECRETS_FILE ||
    "";

  const candidates = [
    envFromVar.trim() || null,
    fileArg,
    join(homedir(), ".postforge-deploy-check.env"),
    join(process.cwd(), "deploy", "secrets.preview.env"),
    join(process.cwd(), ".env.production.local"),
  ].filter(Boolean);

  let pathUsed = null;
  let env = {};
  for (const p of candidates) {
    const full = resolveEnvFilePath(p);
    if (full && existsSync(full)) {
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
    const homeFile = join(homedir(), ".postforge-deploy-check.env");
    console.log("No env file found.\n");
    console.log("Editors often hide gitignored files (e.g. deploy/secrets). Pick one:\n");
    console.log(
      `  1) Create  ${homeFile}  (not in repo — easy to open) with KEY=value lines from Railway`,
    );
    console.log("  2) Set env  DEPLOY_CHECK_FILE=C:\\absolute\\path\\railway.env  then npm run deploy:check");
    console.log("  3) Create  deploy/secrets.preview.env  or  .env.production.local  in the repo");
    console.log("  4) Or run:  node scripts/check-deploy-readiness.mjs --file C:\\path\\railway.env\n");
    console.log("Required keys: scripts/required-env.production.json\n");
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
