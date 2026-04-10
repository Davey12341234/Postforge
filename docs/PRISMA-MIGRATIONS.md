# Prisma migrations — PostForge

## Initial migration

- Folder: `prisma/migrations/20260410120000_init_unified_studio/migration.sql`
- Generated with: `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
- **PostgreSQL only** (see `migration_lock.toml`).

## New empty database (e.g. Railway Postgres)

```bash
npx prisma migrate deploy
```

`railway.json` runs this in **`preDeployCommand`** before `npm run start`.

## Existing database (already has tables from `db push`)

`migrate deploy` errors with **P3005** (schema not empty). Baseline:

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
