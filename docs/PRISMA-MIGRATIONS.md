# Prisma migrations — PostForge

## Initial migration

- Folder: `prisma/migrations/20260410120000_init_unified_studio/migration.sql`
- Generated with: `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
- **PostgreSQL only** (see `migration_lock.toml`).

## New empty database (e.g. Railway Postgres)

```bash
npx prisma migrate deploy
```

`railway.json` runs **`node scripts/railway-deploy-migrate.mjs`** before **`next start`** (migrate deploy; on **P3005**, `migrate resolve --applied` per migration, then retry). You normally do **not** need to run `migrate resolve` by hand on Railway.

## Existing database (already has tables from `db push`)

`migrate deploy` errors with **P3005** (schema not empty). On Railway this is handled by **`scripts/railway-deploy-migrate.mjs`**. For a **manual** baseline elsewhere:

```bash
npx prisma migrate resolve --applied 20260410120000_init_unified_studio
```

This records the migration as applied **without** running SQL. Only do this if the live schema already matches `schema.prisma`.

## New migration after schema edits

In an interactive terminal (with `DATABASE_URL`):

```bash
npx prisma migrate dev --name describe_your_change
```

Or use `bash scripts/generate-migration.sh describe_your_change` on macOS/Linux/Git Bash.
