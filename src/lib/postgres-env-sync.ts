/** Mirror DATABASE_URL ↔ POSTGRES_URL so runtime and tools agree with Vercel/Neon naming. */
function syncDatabaseUrlAliases(): void {
  const db = process.env.DATABASE_URL?.trim();
  const pg = process.env.POSTGRES_URL?.trim();
  const np = process.env.POSTGRES_URL_NON_POOLING?.trim();

  if (!db && pg) process.env.DATABASE_URL = pg;
  if (!process.env.DATABASE_URL?.trim() && np) process.env.DATABASE_URL = np;

  if (!process.env.POSTGRES_URL?.trim() && process.env.DATABASE_URL?.trim()) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
  }
  if (!process.env.POSTGRES_URL?.trim() && np) process.env.POSTGRES_URL = np;
}

syncDatabaseUrlAliases();
