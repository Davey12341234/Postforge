#!/usr/bin/env node
/**
 * Cross-platform deployment checks (Windows-friendly).
 * Usage:
 *   node scripts/verify-deployment.mjs
 *   node scripts/verify-deployment.mjs https://your-app.up.railway.app
 */

import { existsSync } from "fs";
import { homedir } from "os";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
let warn = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
  pass++;
}
function bad(msg) {
  console.log(`  ✗ ${msg}`);
  fail++;
}
function w(msg) {
  console.log(`  ⚠ ${msg}`);
  warn++;
}

console.log("\n=== PostForge — verify deployment ===\n");

// 1) deploy:check if secrets file exists (repo, home, or DEPLOY_CHECK_FILE)
const secrets = join(root, "deploy", "secrets.preview.env");
const prodLocal = join(root, ".env.production.local");
const homeSecrets = join(homedir(), ".postforge-deploy-check.env");
const deployCheckFile = process.env.DEPLOY_CHECK_FILE?.trim();
const checkScript = join(root, "scripts", "check-deploy-readiness.mjs");
const hasSecretsFile =
  (deployCheckFile && existsSync(deployCheckFile)) ||
  existsSync(secrets) ||
  existsSync(prodLocal) ||
  existsSync(homeSecrets);
if (hasSecretsFile) {
  const r = spawnSync(process.execPath, [checkScript], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    env: process.env,
  });
  if (r.status === 0) {
    ok("deploy:check (secrets file)");
  } else {
    w("deploy:check failed or incomplete — fix your env file (see deploy/WHERE-TO-PUT-SECRETS.txt)");
    console.log(r.stdout || r.stderr || "");
  }
} else {
  w(
    "No secrets file found — use %USERPROFILE%\\.postforge-deploy-check.env, DEPLOY_CHECK_FILE, deploy/secrets.preview.env, or .env.production.local (see deploy/WHERE-TO-PUT-SECRETS.txt)",
  );
}

// 2) migration SQL must not have UTF-8 BOM (PostgreSQL rejects it)
const bomScript = join(root, "scripts", "check-migration-bom.mjs");
const bom = spawnSync(process.execPath, [bomScript], { cwd: root, encoding: "utf8" });
if (bom.status === 0) {
  ok("migration.sql files have no BOM");
} else {
  bad("migration BOM check failed");
  console.log(bom.stdout || bom.stderr || "");
}

// 3) tsc
const tsc = spawnSync(
  "npx",
  ["tsc", "--noEmit"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (tsc.status === 0) {
  ok("npx tsc --noEmit");
} else {
  bad("npx tsc --noEmit");
  console.log(tsc.stdout || tsc.stderr || "");
}

async function liveChecks() {
  const base = process.argv[2];
  if (!base || base.includes("localhost") || base.includes("127.0.0.1")) {
    if (base) w("Skipping live checks for localhost — pass a production URL to test");
    return;
  }
  const url = base.replace(/\/$/, "");
  console.log(`\n--- HTTP checks: ${url} ---\n`);
  try {
    const live = await fetch(`${url}/api/health/live`, {
      signal: AbortSignal.timeout(15000),
    });
    if (live.ok) {
      ok(`/api/health/live (${live.status})`);
    } else {
      bad(`/api/health/live HTTP ${live.status}`);
    }
  } catch (e) {
    bad(`/api/health/live unreachable: ${e instanceof Error ? e.message : e}`);
  }
  try {
    const health = await fetch(`${url}/api/health`, {
      signal: AbortSignal.timeout(15000),
    });
    if (health.ok) {
      ok(`/api/health (${health.status})`);
      const j = await health.json();
      if (j.services?.database === "connected") {
        ok("health: database connected");
      } else {
        bad("health: database not connected");
      }
    } else {
      bad(`/api/health HTTP ${health.status}`);
    }
  } catch (e) {
    bad(`/api/health unreachable: ${e instanceof Error ? e.message : e}`);
  }
  try {
    const u = await fetch(`${url}/unified`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    if ([200, 302, 307, 308].includes(u.status)) {
      ok(`/unified (${u.status})`);
    } else {
      bad(`/unified (${u.status})`);
    }
  } catch (e) {
    bad(`/unified unreachable: ${e instanceof Error ? e.message : e}`);
  }
}

await liveChecks();

console.log("\n=====================================");
console.log(`Passed: ${pass}  Failed: ${fail}  Warnings: ${warn}`);
console.log("=====================================\n");

process.exit(fail > 0 ? 1 : 0);
