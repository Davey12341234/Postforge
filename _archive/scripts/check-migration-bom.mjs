#!/usr/bin/env node
/**
 * Fail if any prisma migration.sql starts with UTF-8 BOM (breaks PostgreSQL).
 * Run: node scripts/check-migration-bom.mjs
 */

import { readdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const migrationsRoot = join(root, "prisma", "migrations");

let bad = 0;
if (!existsSync(migrationsRoot)) {
  console.error("No prisma/migrations directory.");
  process.exit(1);
}

for (const ent of readdirSync(migrationsRoot, { withFileTypes: true })) {
  if (!ent.isDirectory()) continue;
  const sqlPath = join(migrationsRoot, ent.name, "migration.sql");
  if (!existsSync(sqlPath)) continue;
  const buf = readFileSync(sqlPath);
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  if (buf.length >= 3 && buf.subarray(0, 3).equals(bom)) {
    console.error(`UTF-8 BOM at start of: ${ent.name}/migration.sql`);
    bad++;
  }
  const t = buf.toString("utf8");
  if (t.length > 0 && t.charCodeAt(0) === 0xfeff) {
    console.error(`U+FEFF at start of: ${ent.name}/migration.sql`);
    bad++;
  }
}

if (bad > 0) {
  console.error("\nRemove BOM (save as UTF-8 without BOM) or run from repo after fix.");
  process.exit(1);
}
console.log("No BOM in migration.sql files.");
process.exit(0);
