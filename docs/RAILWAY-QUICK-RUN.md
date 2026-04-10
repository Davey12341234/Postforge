# Railway deploy — simple steps (PostForge / Unified Studio)

Longer reference: [`PRODUCTION-DEPLOYMENT.md`](./PRODUCTION-DEPLOYMENT.md)

---

## Automation (fewer mistakes)

The repo includes guardrails so you don’t ship with missing env vars or forget migrations.

| What | How |
|------|-----|
| **Validate env before deploy** | Copy variables from Railway into **`deploy/secrets.preview.env`** (see **`deploy/secrets.preview.env.example`**). Run **`npm run deploy:check`**. Exit code **0** = all required keys are non-empty and basic format checks pass (`NEXTAUTH_URL` is `https://…`, Stripe prices look like `price_…`). |
| **Required variable list** | **`scripts/required-env.production.json`** — single source of truth; update if you add new secrets. |
| **Migrations on Railway** | Root **`railway.json`** runs **`node scripts/railway-deploy-migrate.mjs`** as **`preDeployCommand`** (migrate deploy + automatic P3005 baseline), then **`npm run start`**. Healthcheck: **`GET /api/health`**. |
| **Manual / non-Railway** | **`npm run start:production`** runs migrate then `next start` (e.g. custom Docker without pre-deploy). |

**Workflow:** Set vars in Railway → copy them into `deploy/secrets.preview.env` locally → `npm run deploy:check` → fix until green → push or `railway up`.

---

## Can I “import” my project files into Railway?

**There is no “Import folder / Upload zip” button** that builds a full Next.js app for you. Railway gets your code in one of these ways:

| Method | What you do | Best when |
|--------|-------------|-----------|
| **A. GitHub** | Connect your GitHub repo in the Railway UI. Every push can auto-deploy. | You use Git/GitHub (recommended). |
| **B. CLI (`railway up`)** | From your **local** project folder, run `railway link` then `railway up`. Railway uploads your **current** files and builds. | Code only on your PC or you prefer manual deploys. |
| **C. Git remote** | Add Railway as a `git remote` and `git push railway main`. | Advanced; less common. |

So: you’re not “importing files” through a file picker — you’re **connecting a repo** or **uploading via CLI** from the folder that already has your code (e.g. `C:\Users\…\postforge`).

---

## Path A — Deploy from GitHub (recommended)

### Step 1 — Put the project on GitHub (if it isn’t already)

1. On [github.com](https://github.com), create a **new repository** (empty is fine).
2. On your PC, in the **postforge** folder (where `package.json` is):

```powershell
cd C:\path\to\postforge
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

3. **Do not commit secrets.** Ensure `.env`, `.env.local` are in `.gitignore` (they should be).

### Step 2 — Create the Railway project from GitHub

1. Go to [railway.app](https://railway.app) → **New project**.
2. Choose **GitHub Repository** (not “Empty project”).
3. Authorize Railway to read your repos if asked.
4. Select **your postforge repo** and branch **`main`**.
5. Railway detects **Node/Next.js** and sets a build command — leave defaults unless a build fails (then check logs).

### Step 3 — Add PostgreSQL

1. Open your **project** in Railway (not the “new project” wizard).
2. Click **\+ New** (or **Create**) → **Database** → **Add PostgreSQL**.
3. Railway creates a service and sets **`DATABASE_URL`** on linked services automatically — you usually **reference** this variable from your app service (see Railway docs: “Variables” → reference `${{Postgres.DATABASE_URL}}` if needed).

### Step 4 — Set environment variables

1. Click your **web service** (the one running Next.js), not only the database.
2. Open **Variables**.
3. Add each variable from [`PRODUCTION-DEPLOYMENT.md`](./PRODUCTION-DEPLOYMENT.md) (especially **`NEXTAUTH_URL`**, **`NEXTAUTH_SECRET`**, **`ANTHROPIC_API_KEY`**, Stripe keys, **`STRIPE_PRICE_*`**, **`STRIPE_WEBHOOK_SECRET`**, **`ADMIN_REVENUE_SECRET`**).
4. **Deploy** or wait for auto-redeploy.

### Step 5 — Run database migrations (first time)

After the app service can reach Postgres:

- **Option 1 — Railway dashboard:** open a shell on the service (if available) and run:

  `npx prisma migrate deploy`

- **Option 2 — Local CLI** (linked to same project):

```powershell
cd C:\path\to\postforge
railway link
railway run npx prisma migrate deploy
```

### Step 6 — Get your URL and test

1. **Settings** → **Networking** / **Generate domain** → you get `https://something.up.railway.app`.
2. Open `https://YOUR-URL.up.railway.app/unified` (sign in if required).

### Step 7 — Custom domain (GoDaddy)

1. Railway → **Settings** → **Domains** → add `yourdomain.com` and `www`.
2. Copy the **CNAME** or **A** records Railway shows.
3. In GoDaddy → **DNS** → add/edit records to match.
4. Wait for DNS (minutes to hours), then set **`NEXTAUTH_URL=https://yourdomain.com`** (no trailing slash).

---

## Path B — No GitHub: empty project + CLI from your PC

Use this if you **don’t** want to use GitHub right now.

### Step 1 — Log in

```powershell
railway login
```

Complete login in the browser.

### Step 2 — Create an empty project in the browser

1. Railway → **New project** → **Empty project**.
2. Name it (e.g. `postforge-production`).

### Step 3 — Link your local folder to that project

```powershell
cd C:\path\to\postforge
railway link
```

Pick the project you just created.

### Step 4 — Add Postgres

```powershell
railway add -d postgres
```

(Or add PostgreSQL in the dashboard — same idea.)

### Step 5 — Set variables

Same list as Path A, step 4 — in Railway **Variables** for the service that will run the app.

You may need to **create a service** that runs your app: some flows use `railway up` which creates a deploy from your folder. If Railway only shows Postgres, run:

```powershell
railway up
```

from `postforge` so it deploys this codebase.

### Step 6 — Deploy and migrate

```powershell
railway up
railway run npx prisma migrate deploy
```

### Step 7 — Domain

Same as Path A, step 7.

---

## Quick checklist (both paths)

- [ ] Postgres added; app can read `DATABASE_URL`
- [ ] All env vars set (**`NEXTAUTH_URL`** matches final public URL)
- [ ] `npx prisma migrate deploy` succeeded once
- [ ] `/unified` loads on Railway URL
- [ ] Stripe webhook URL + **`invoice.paid`** + signing secret match Railway env
- [ ] GoDaddy DNS points to Railway; SSL shows “ready”

---

## If you’re stuck on “What would you like to create?”

- **Use GitHub** → choose **GitHub Repository** (Path A).
- **No GitHub** → choose **Empty project**, then use **Path B** with `railway link` + `railway up`.

---

## Rollback

Railway → **Deployments** → select a previous successful deploy → **Rollback** (wording may vary).
