/**
 * Connectivity check for Postgres (runs only when DATABASE_URL / POSTGRES_URL exists).
 */
import postgres from "postgres";

import {
  databaseUrlIsStub,
  loadEnvLocal,
  missingDatabaseUrlHelp,
  resolveDatabaseUrlFromEnv,
  syncDatabaseUrlAliases,
} from "./env-local-loader.mjs";

loadEnvLocal();
syncDatabaseUrlAliases();

const url = resolveDatabaseUrlFromEnv();
if (!url) {
  console.error(missingDatabaseUrlHelp().trim());
  process.exit(1);
}
if (databaseUrlIsStub(url)) {
  console.error(
    [
      "❌ DATABASE_URL still targets host `placeholder` (integration stub).",
      "Fixing Neon in the Neon UI does not update Vercel until you save a real URL on Vercel:",
      "  Vercel → Project → Settings → Environment Variables → DATABASE_URL (Production)",
      "  Paste the connection string from Neon → Dashboard → your DB → Connection details.",
      "Then: npx vercel env pull .env.local --environment production --yes",
      "     npm run db:ping",
    ].join("\n"),
  );
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 15 });
try {
  await sql`select 1 as ok`;
  console.log("✅ db:ping successful — database is reachable.");
} catch (e) {
  const detail = e instanceof Error ? e.message : String(e);
  console.error(`❌ db:ping failed — DB URL exists but connection was refused/is invalid.`);
  console.error(detail);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
