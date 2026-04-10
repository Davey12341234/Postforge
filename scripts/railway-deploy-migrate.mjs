#!/usr/bin/env node
/**
 * Railway pre-deploy: run `prisma migrate deploy`, and if the database already
 * contains schema but no migration history (Prisma P3005), baseline each
 * migration in order with `migrate resolve --applied` until deploy succeeds.
 *
 * Usage: node scripts/railway-deploy-migrate.mjs
 */

import { readdirSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function listMigrationNames() {
  const dir = join(root, "prisma", "migrations");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{14}_/.test(d.name))
    .map((d) => d.name)
    .sort();
}

function runPrisma(args) {
  // `shell: true` helps Windows find `npx` the same way an interactive shell does.
  const r = spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    cwd: root,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
  });
  const stdout = r.stdout || "";
  const stderr = r.stderr || "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  const combined = stdout + stderr;
  const status = typeof r.status === "number" ? r.status : 1;
  return { status, combined };
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

// Do not require DATABASE_URL in process.env — Prisma loads `.env` from the
// project root when invoked (same as `npx prisma migrate deploy`).

const names = listMigrationNames();
let result = runPrisma(["migrate", "deploy"]);

if (result.status === 0) {
  process.exit(0);
}

if (!isP3005NonEmpty(result.combined)) {
  process.exit(1);
}

if (names.length === 0) {
  console.error("[railway-deploy-migrate] P3005 but no migration folders under prisma/migrations.");
  process.exit(1);
}

console.error(
  "[railway-deploy-migrate] P3005 (non-empty DB / missing migration history). Baseline migrations as applied, then retry deploy."
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
