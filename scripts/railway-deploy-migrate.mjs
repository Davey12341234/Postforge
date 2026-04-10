#!/usr/bin/env node
/**
 * Run before `next start` on Railway: `prisma migrate deploy`, with recovery for:
 * - P3009: failed migration recorded → `migrate resolve --rolled-back`, then retry
 * - P3005: non-empty DB / no history → `migrate resolve --applied` per migration, then retry
 *
 * Usage: node scripts/railway-deploy-migrate.mjs
 */

import { readdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const isWin = process.platform === "win32";

function listMigrationNames() {
  const dir = join(root, "prisma", "migrations");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{14}_/.test(d.name))
    .map((d) => d.name)
    .sort();
}

/** PostgreSQL rejects a leading UTF-8 BOM (U+FEFF) — "syntax error at or near \"﻿\"" */
function stripBomFromMigrationSqlFiles() {
  const dir = join(root, "prisma", "migrations");
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const sqlPath = join(dir, ent.name, "migration.sql");
    if (!existsSync(sqlPath)) continue;
    const buf = readFileSync(sqlPath);
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    if (buf.length >= 3 && buf.subarray(0, 3).equals(bom)) {
      console.error(`[railway-deploy-migrate] Stripping UTF-8 BOM from ${ent.name}/migration.sql`);
      writeFileSync(sqlPath, buf.subarray(3));
      continue;
    }
    const text = buf.toString("utf8");
    if (text.length > 0 && text.charCodeAt(0) === 0xfeff) {
      console.error(`[railway-deploy-migrate] Stripping U+FEFF from ${ent.name}/migration.sql`);
      writeFileSync(sqlPath, text.slice(1), "utf8");
    }
  }
}

function runPrisma(args) {
  const binUnix = join(root, "node_modules", ".bin", "prisma");
  const binWin = join(root, "node_modules", ".bin", "prisma.cmd");
  let cmd;
  let cmdArgs;
  let shell;
  if (isWin && existsSync(binWin)) {
    cmd = binWin;
    cmdArgs = args;
    shell = true;
  } else if (!isWin && existsSync(binUnix)) {
    cmd = binUnix;
    cmdArgs = args;
    shell = false;
  } else if (existsSync(binUnix)) {
    cmd = binUnix;
    cmdArgs = args;
    shell = false;
  } else {
    cmd = "npx";
    cmdArgs = ["prisma", ...args];
    shell = isWin;
  }

  const r = spawnSync(cmd, cmdArgs, {
    encoding: "utf8",
    cwd: root,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
    shell,
  });
  if (r.error) {
    console.error("[railway-deploy-migrate] spawn error:", r.error.message);
  }
  const stdout = r.stdout || "";
  const stderr = r.stderr || "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  const combined = stdout + stderr;
  const status = typeof r.status === "number" ? r.status : 1;
  return { status, combined };
}

function isP3009FailedMigration(combined) {
  return /P3009/i.test(combined) || /failed migrations/i.test(combined);
}

/** P3009 or P3018 / "migration failed to apply" — use rolled-back then retry */
function needsRolledBackRecovery(combined) {
  return (
    isP3009FailedMigration(combined) ||
    /P3018/i.test(combined) ||
    /A migration failed to apply/i.test(combined)
  );
}

function isP3005NonEmpty(combined) {
  return (
    /P3005/i.test(combined) ||
    /database schema is not empty/i.test(combined) ||
    /schema is not empty/i.test(combined)
  );
}

function resolveAlreadyRecorded(combined) {
  return /already recorded|already been applied|already applied/i.test(combined);
}

function rolledBackNoop(combined) {
  return /not in a failed state|No failed migration|could not find migration/i.test(combined);
}

const isRailwayRuntime = Boolean(
  process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_DEPLOYMENT_ID,
);
if (isRailwayRuntime && !String(process.env.DATABASE_URL || "").trim()) {
  console.error(`
[postforge] DATABASE_URL is not set on this Railway service.

  In Railway: open your app service (Postforge) → Variables → New Variable
    Name:  DATABASE_URL
    Value: reference your Postgres plugin, for example:
           \${{ Postgres.DATABASE_URL }}
    (Use the exact Postgres service name from your project canvas.)

  Redeploy after saving.
`);
  process.exit(1);
}

stripBomFromMigrationSqlFiles();

const names = listMigrationNames();
let result = runPrisma(["migrate", "deploy"]);

if (result.status === 0) {
  process.exit(0);
}

// P3009 / P3018: failed migration — mark rolled back and retry deploy.
if (needsRolledBackRecovery(result.combined) && names.length > 0) {
  console.error(
    "[railway-deploy-migrate] Failed migration recorded (P3009/P3018). Marking rolled back, then retry deploy.",
  );
  for (const name of names) {
    const res = runPrisma(["migrate", "resolve", "--rolled-back", name]);
    if (res.status !== 0 && !rolledBackNoop(res.combined)) {
      console.error(`[railway-deploy-migrate] migrate resolve --rolled-back ${name} failed.`);
      process.exit(1);
    }
  }
  result = runPrisma(["migrate", "deploy"]);
  if (result.status === 0) {
    process.exit(0);
  }
  if (needsRolledBackRecovery(result.combined)) {
    console.error(
      "[railway-deploy-migrate] Still failing after rolled-back. DB may be half-migrated — reset the DB or fix manually (see docs/PRISMA-MIGRATIONS.md).",
    );
    process.exit(1);
  }
}

if (!isP3005NonEmpty(result.combined)) {
  process.exit(1);
}

if (names.length === 0) {
  console.error("[railway-deploy-migrate] P3005 but no migration folders under prisma/migrations.");
  process.exit(1);
}

console.error(
  "[railway-deploy-migrate] P3005 (non-empty DB / missing migration history). Baseline migrations as applied, then retry deploy.",
);

for (const name of names) {
  console.error(`[railway-deploy-migrate] prisma migrate resolve --applied ${name}`);
  const res = runPrisma(["migrate", "resolve", "--applied", name]);
  if (res.status !== 0 && !resolveAlreadyRecorded(res.combined)) {
    process.exit(1);
  }

  result = runPrisma(["migrate", "deploy"]);
  if (result.status === 0) {
    process.exit(0);
  }
  if (!isP3005NonEmpty(result.combined)) {
    process.exit(1);
  }
}

console.error("[railway-deploy-migrate] migrate deploy still failing after baseline attempts.");
process.exit(1);
