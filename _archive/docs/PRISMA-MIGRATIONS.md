# Prisma migrations — PostForge

## Initial migration

- SQL files must be **UTF-8 without BOM**. A leading BOM (`U+FEFF`) causes PostgreSQL `syntax error at or near "﻿"` on migrate.
- Folder: `prisma/migrations/20260410120000_init_unified_studio/migration.sql`
- Generated with: `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
- **PostgreSQL only** (see `migration_lock.toml`).

## New empty database (e.g. Railway Postgres)

```bash
npx prisma migrate deploy
```

`railway.json` runs **`node scripts/railway-deploy-migrate.mjs`** before **`next start`** (migrate deploy; automatic recovery for **P3009** and **P3005**). You usually do **not** need to run `migrate resolve` by hand on Railway.

## Failed migration (P3009)

If a migration **started but failed** (e.g. timeout, error mid-SQL), Prisma records it as failed and **`migrate deploy`** stops with **P3009**.

**`scripts/railway-deploy-migrate.mjs`** runs **`prisma migrate resolve --rolled-back <migration_name>`** for each folder under `prisma/migrations`, then retries **`migrate deploy`**.

**Manual fix** (same DATABASE_URL as production):

```bash
npx prisma migrate resolve --rolled-back 20260410120000_init_unified_studio
npx prisma migrate deploy
```

If the database is **half-created** (some tables exist), you may get “already exists” on retry. Then either **drop and recreate** the schema on a throwaway DB, or manually align tables and use **`migrate resolve --applied`** (advanced).

## Existing database (already has tables from `db push`)

`migrate deploy` errors with **P3005** (schema not empty). On Railway this is handled by **`scripts/railway-deploy-migrate.mjs`**. For a **manual** baseline elsewhere:

```bash
npx prisma migrate resolve --applied 20260410120000_init_unified_studio
```

This records the migration as applied **without** running SQL. Only do this if the live schema already matches `schema.prisma`.

## Migration order (Postgres)

Migrations apply in **lexicographic folder name order**. The enum `UnifiedImageProvider` is created in **`20260411120000_add_unified_generated_images`**. Do not reference that type in an **earlier** timestamped migration (e.g. `20260410140000` only adds `openaiChatConversationId`; `GPT_IMAGE` is added in **`20260412000000_add_gpt_image_enum_value`**).

## Legacy DB: init “applied” but unified tables missing

If `_prisma_migrations` shows `20260410120000_init_unified_studio` as finished but **`unified_studio_profiles` (and other unified tables) do not exist**, the history was baselined incorrectly. Recovery: run **`npx prisma db push`** (adds tables to match `schema.prisma`), remove duplicate/broken rows for failed migrations in `_prisma_migrations` if needed, then **`prisma migrate resolve --applied`** for each migration folder so history matches reality, and verify with **`prisma migrate status`**.

## New migration after schema edits

In an interactive terminal (with `DATABASE_URL`):

```bash
npx prisma migrate dev --name describe_your_change
```

Or use `bash scripts/generate-migration.sh describe_your_change` on macOS/Linux/Git Bash.
