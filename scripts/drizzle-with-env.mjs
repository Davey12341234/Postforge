#!/usr/bin/env node
/**
 * Loads .env.local, syncs DB URL aliases, then runs `npx drizzle-kit <migrate|generate>`
 * with inherited env (same vars Drizzle CLI + drizzle.config.ts require).
 */
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import {
  loadEnvLocal,
  missingDatabaseUrlHelp,
  resolveDatabaseUrlFromEnv,
  syncDatabaseUrlAliases,
} from "./env-local-loader.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sub = process.argv[2];

if (sub !== "migrate" && sub !== "generate") {
  console.error("Usage: node scripts/drizzle-with-env.mjs <migrate|generate>");
  process.exit(1);
}

loadEnvLocal();
syncDatabaseUrlAliases();

const url = resolveDatabaseUrlFromEnv();
if (!url) {
  console.error(missingDatabaseUrlHelp());
  process.exit(1);
}

try {
  execSync(`npx drizzle-kit ${sub}`, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: true,
  });
} catch (err) {
  const status = typeof err?.status === "number" ? err.status : 1;
  process.exit(status);
}
