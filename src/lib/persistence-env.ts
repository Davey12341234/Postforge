/** Same connection string Vercel/Neon may expose as `POSTGRES_URL` or `DATABASE_URL`. */
export function postgresConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim()
  );
}

/** When set, wallet + billing use Postgres via Drizzle instead of JSON under `.data` or `/tmp`. */
export function isPostgresPersistenceEnabled(): boolean {
  return Boolean(postgresConnectionString());
}
