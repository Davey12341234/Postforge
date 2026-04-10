# Cursor / AI — execution order (PostForge)

## Done in repo (baseline)

- [x] Initial migration: `prisma/migrations/20260410120000_init_unified_studio/`
- [x] `GET /api/health` — Railway healthcheck target
- [x] `railway.json` — `preDeployCommand` + healthcheck
- [x] `npm run deploy:check`, `npm run verify:deploy`
- [x] `.env.production.template`, `docs/STRIPE-SETUP-GUIDE.md`

## You run locally

1. `npx tsc --noEmit` && `npm run build`
2. `npm run verify:deploy` — optional: `node scripts/verify-deployment.mjs https://YOUR_URL`
3. `git add prisma/migrations railway.json scripts src/app/api/health .env.production.template docs`
4. `git commit` — see `.gitmessage-template`
5. `git push` → Railway / CI

## If `migrate deploy` says “database is not empty”

Existing DB created with `db push`: baseline with:

```bash
npx prisma migrate resolve --applied 20260410120000_init_unified_studio
```

**Fresh** Railway Postgres: `migrate deploy` applies SQL normally.

## Env

Fill Railway from `.env.production.template` + [`deploy/secrets.preview.env.example`](deploy/secrets.preview.env.example). **`NEXTAUTH_URL`** = site root `https://…` (not `…/unified`).
