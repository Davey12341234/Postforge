#!/usr/bin/env node
/**
 * Cross-platform deployment checks (Windows-friendly).
 * Usage:
 *   node scripts/verify-deployment.mjs
 *   node scripts/verify-deployment.mjs https://your-app.up.railway.app
 */

import { existsSync } from "fs";
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

// 1) deploy:check if secrets file exists
const secrets = join(root, "deploy", "secrets.preview.env");
const prodLocal = join(root, ".env.production.local");
const checkScript = join(root, "scripts", "check-deploy-readiness.mjs");
if (existsSync(secrets) || existsSync(prodLocal)) {
  const r = spawnSync(process.execPath, [checkScript], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (r.status === 0) {
    ok("deploy:check (secrets file)");
  } else {
    w("deploy:check failed or incomplete — fix deploy/secrets.preview.env");
    console.log(r.stdout || r.stderr || "");
  }
} else {
  w("No deploy/secrets.preview.env or .env.production.local — run npm run deploy:check after creating one");
}

// 2) tsc
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
