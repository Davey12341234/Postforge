/**
 * Loads `.env.local` into process.env (non-empty keys win over existing shell vars).
 * Empty values are skipped so a pulled file like DATABASE_URL="" does not wipe
 * vars already injected (e.g. `vercel env run -e production -- npm run db:ping`).
 * Handles UTF-8 BOM and KEY=value with optional quotes.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ENV_LOCAL_PATH = join(root, ".env.local");

/** @param {string} raw */
export function parseDotEnvContent(raw) {
  raw = raw.replace(/^\uFEFF/, "");

  /** @type {Record<string, string>} */
  const parsed = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    parsed[k] = v;
  }
  return parsed;
}

/** Parsed keys from `.env.local` only (does not mutate `process.env`). For polling scripts. */
export function readEnvLocalMap() {
  if (!existsSync(ENV_LOCAL_PATH)) return {};
  const raw = readFileSync(ENV_LOCAL_PATH, "utf8");
  return parseDotEnvContent(raw);
}

export function loadEnvLocal() {
  if (!existsSync(ENV_LOCAL_PATH)) return false;
  const parsed = parseDotEnvContent(readFileSync(ENV_LOCAL_PATH, "utf8"));
  for (const [k, v] of Object.entries(parsed)) {
    if (!String(v).trim()) continue;
    process.env[k] = v;
  }
  return true;
}

/** Prefer `DATABASE_URL`, then `POSTGRES_URL`, then non-pooling URL. */
export function resolveDatabaseUrlFromEnv() {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    ""
  );
}

/** @param {string} url */
export function postgresUrlHostname(url) {
  try {
    return new URL(url.replace(/^postgres(ql)?:\/\//i, "pg://")).hostname || "";
  } catch {
    return "";
  }
}

/** True when the URL uses the stub host Vercel/Neon integrations sometimes inject before a real DB is linked. */
export function databaseUrlIsStub(url) {
  return postgresUrlHostname(url) === "placeholder";
}

/** True if `.env.local` contains a Postgres connection string (parsed map). */
export function envMapHasDatabaseUrl(map) {
  return Boolean(
    map.DATABASE_URL?.trim() || map.POSTGRES_URL?.trim() || map.POSTGRES_URL_NON_POOLING?.trim(),
  );
}

/** Ensure both DATABASE_URL and POSTGRES_URL exist when any Neon/Vercel URL is set. */
export function syncDatabaseUrlAliases() {
  const np = process.env.POSTGRES_URL_NON_POOLING?.trim();

  if (!process.env.DATABASE_URL?.trim() && process.env.POSTGRES_URL?.trim()) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL;
  }
  if (!process.env.DATABASE_URL?.trim() && np) {
    process.env.DATABASE_URL = np;
  }

  if (!process.env.POSTGRES_URL?.trim() && process.env.DATABASE_URL?.trim()) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
  }
  if (!process.env.POSTGRES_URL?.trim() && np) {
    process.env.POSTGRES_URL = np;
  }
}

export function missingDatabaseUrlHelp() {
  return `
No Postgres URL found in .env.local (need DATABASE_URL or POSTGRES_URL).

Fix (pick one):

  A) Pull from Vercel (repo must be linked: npx vercel link):
     npx vercel env pull .env.local --environment production --yes

  B) Manual — Vercel Dashboard → your Project → Storage → Postgres →
     copy "Connection string" (or POSTGRES_URL / DATABASE_URL) into .env.local:

     DATABASE_URL="postgresql://..."

  C) After creating Neon: confirm the database is Linked to this project so
     Vercel injects env vars; then run (A) again.

  D) If \`.env.local\` shows DATABASE_URL="" (empty) after pull: the real URL may
     still exist on Vercel — empty lines can mask it for local scripts. Either
     paste the Neon URL into \`.env.local\`, remove the empty DATABASE_URL line,
     or run: npm run db:ping:vercel   (uses \`vercel env run\` without masking).

Then retry: npm run db:ping && npm run db:migrate
`;
}
