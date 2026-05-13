#!/usr/bin/env node
/**
 * Autonomous go-live sequence: DB env + migrate → DNS propagation → Stripe webhook → deploy + smoke.
 * Uses polling against real infra (no manual Enter).
 */

import { execSync } from "child_process";
import dns from "node:dns/promises";
import { appendFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ENV_LOCAL_PATH,
  envMapHasDatabaseUrl,
  loadEnvLocal,
  readEnvLocalMap,
  syncDatabaseUrlAliases,
} from "./env-local-loader.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERCEL_PROJECT_JSON = join(ROOT, ".vercel", "project.json");

const R = "\x1b[31m";
const G = "\x1b[32m";
const Y = "\x1b[33m";
const B = "\x1b[1m";
const N = "\x1b[0m";

const WWW_HOST = process.env.GO_LIVE_DNS_HOST?.trim() || "www.bbgpt.ai";
const VERCEL_TARGET_IP = "76.76.21.21";
const POLL_DB_MS = 30_000;
const POLL_DNS_MS = 30_000;
const POLL_WEBHOOK_MS = 15_000;
const POST_DEPLOY_WAIT_MS = 45_000;

/** Events that match src/app/api/stripe/webhook/route.ts */
const STRIPE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function green(msg) {
  console.log(`${G}${msg}${N}`);
}

function yellow(msg) {
  console.log(`${Y}${msg}${N}`);
}

function red(msg) {
  console.log(`${R}${msg}${N}`);
}

function headline(msg) {
  console.log(`\n${B}${msg}${N}\n`);
}

function execNpm(script, exitOnFail = true) {
  try {
    execSync(`npm run ${script}`, {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
  } catch (e) {
    red(`\n❌ npm run ${script} failed`);
    console.error(String(e.stderr || e.message || e));
    if (exitOnFail) process.exit(1);
    throw e;
  }
}

function execCapture(cmd) {
  try {
    const out = execSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      shell: true,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, combined: typeof out === "string" ? out : String(out) };
  } catch (e) {
    const stdout = e.stdout?.toString?.("utf8") ?? "";
    const stderr = e.stderr?.toString?.("utf8") ?? "";
    return {
      ok: false,
      combined: stdout + stderr + (e.message || ""),
    };
  }
}

function extractWhsec(text) {
  const m = text.match(/whsec_[A-Za-z0-9]+/);
  return m ? m[0] : null;
}

function appendStripeWebhookSecret(secret) {
  const marker = "\n# Added by scripts/go-live.mjs\n";
  appendFileSync(
    ENV_LOCAL_PATH,
    `${marker}STRIPE_WEBHOOK_SECRET=${secret}\n`,
    "utf8",
  );
}

async function dnsPointsToVercel(hostname = WWW_HOST) {
  /** @type {string[]} */
  let ipv4 = [];
  try {
    ipv4 = await dns.resolve4(hostname);
  } catch {
    return false;
  }

  if (ipv4.includes(VERCEL_TARGET_IP)) return true;

  try {
    const cnames = await dns.resolveCname(hostname);
    /** Vercel: legacy cname.vercel-dns.com or per-project *.vercel-dns-NNN.com */
    if (
      cnames.some(
        (h) =>
          /(^|\.)cname\.vercel-dns\.com\.?$/i.test(h) ||
          /\.vercel-dns-\d+\.com\.?$/i.test(h),
      )
    )
      return true;
  } catch {
    /* not a direct CNAME label or NXDOMAIN chain */
  }

  return false;
}

async function pollUntilDatabaseUrl() {
  headline("Phase 1 — Database");
  let map = readEnvLocalMap();

  if (envMapHasDatabaseUrl(map)) {
    green(`✅ DATABASE_URL / POSTGRES_URL already present in .env.local`);
    return;
  }

  red(
    `🛑 Database URL missing. Go to Vercel Dashboard → Storage → Create Postgres → Link to project.\n${Y}Script is now polling Vercel env every ${POLL_DB_MS / 1000} seconds...${N}`,
  );

  if (!existsSync(VERCEL_PROJECT_JSON)) {
    red("\n❌ Missing .vercel/project.json — run first: npx vercel link");
    process.exit(1);
  }

  while (!envMapHasDatabaseUrl(map)) {
    yellow(`⏳ Pulling Vercel Production env → .env.local …`);
    try {
      execSync("npx vercel env pull .env.local --environment production --yes", {
        cwd: ROOT,
        stdio: "inherit",
        shell: true,
        env: process.env,
      });
    } catch (e) {
      yellow(`vercel env pull failed (will retry): ${String(e.stderr || e.message || e)}`);
    }
    map = readEnvLocalMap();
    if (envMapHasDatabaseUrl(map)) break;
    await sleep(POLL_DB_MS);
  }

  green("✅ DB URL found!");
}

async function pollUntilDns() {
  headline("Phase 2 — DNS");

  if (await dnsPointsToVercel(WWW_HOST)) {
    green(`✅ ${WWW_HOST} already resolves in a Vercel-looking way.\n✅ Phase 2 Complete: DNS is pointing to Vercel.`);
    return;
  }

  red(
    `🛑 DNS not pointing to Vercel. Vercel → Settings → Domains: copy the records shown for www + apex (often www CNAME → *.vercel-dns-NNN.com; apex uses the A/ALIAS rows Vercel lists — not always cname.vercel-dns.com).\n${Y}Script is now polling DNS propagation every ${POLL_DNS_MS / 1000} seconds...${N}`,
  );

  while (true) {
    if (await dnsPointsToVercel(WWW_HOST)) break;
    await sleep(POLL_DNS_MS);
    yellow(`⏳ Re-checking dns.resolve4(${WWW_HOST}) …`);
  }

  green("✅ DNS Propagated!");
  green("✅ Phase 2 Complete: DNS is pointing to Vercel.");
}

function tryStripeCliWebhookCreate() {
  loadEnvLocal();
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    yellow("Stripe CLI: STRIPE_SECRET_KEY not in env — skipping automatic webhook creation.");
    return null;
  }

  const dest = "https://www.bbgpt.ai/api/stripe/webhook";

  const attempts = [
    `npx stripe webhooks create --destination-url "${dest}" --events checkout.session.completed`,
    (() => {
      let cmd = `npx stripe webhook_endpoints create --url "${dest}" --format=json`;
      for (const ev of STRIPE_WEBHOOK_EVENTS) {
        cmd += ` -d "enabled_events[]=${ev}"`;
      }
      return cmd;
    })(),
  ];

  for (const cmd of attempts) {
    yellow(`Trying: ${cmd.slice(0, 120)}…`);
    const r = execCapture(cmd);
    const secret = extractWhsec(r.combined);
    if (secret) return secret;
    if (!r.ok) yellow(`Command failed output (truncated): ${r.combined.slice(0, 400)}`);
  }
  return null;
}

async function pollUntilStripeWebhookSecret() {
  headline("Phase 3 — Stripe webhook");

  loadEnvLocal();
  let map = readEnvLocalMap();

  if (map.STRIPE_WEBHOOK_SECRET?.trim()) {
    green("✅ STRIPE_WEBHOOK_SECRET already in .env.local");
  } else {
    const secret = tryStripeCliWebhookCreate();
    if (secret) {
      appendStripeWebhookSecret(secret);
      green(`✅ Injected STRIPE_WEBHOOK_SECRET into .env.local (${secret.slice(0, 12)}…)`);
    } else {
      red(
        `🛑 Stripe Webhook missing. Create it in the Stripe Dashboard or login to Stripe CLI.\n${Y}Waiting for STRIPE_WEBHOOK_SECRET in .env.local every ${POLL_WEBHOOK_MS / 1000} seconds…${N}`,
      );
      while (!readEnvLocalMap().STRIPE_WEBHOOK_SECRET?.trim()) {
        await sleep(POLL_WEBHOOK_MS);
        yellow("⏳ Still waiting for STRIPE_WEBHOOK_SECRET in .env.local …");
      }
      green("✅ STRIPE_WEBHOOK_SECRET detected in .env.local");
    }
  }

  loadEnvLocal();
  yellow("Running npm run vercel:env:prod (push env to Vercel Production)…");
  try {
    execSync("npm run vercel:env:prod", {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
  } catch (e) {
    red("\n❌ vercel:env:prod failed — fix missing keys in .env.local per script output.");
    console.error(String(e.stderr || e.message || e));
    process.exit(1);
  }

  green("✅ Phase 3 Complete: Stripe Webhook configured.");
}

async function deployAndSmoke() {
  headline("Phase 4 — Deploy & smoke");

  execNpm("deploy:prod");
  yellow(`Waiting ${POST_DEPLOY_WAIT_MS / 1000} seconds for Vercel deployment to fully come online…`);
  await sleep(POST_DEPLOY_WAIT_MS);
  execNpm("launch:smoke");
  green("\n🚀 LAUNCH SEQUENCE COMPLETE. The app is live.");
}

async function main() {
  console.log(`${B}bbGPT — autonomous go-live${N}\n`);

  await pollUntilDatabaseUrl();

  loadEnvLocal();
  syncDatabaseUrlAliases();

  execNpm("db:ping");
  execNpm("db:migrate");

  green("✅ Phase 1 Complete: Database is connected and migrated.");

  await pollUntilDns();
  await pollUntilStripeWebhookSecret();
  await deployAndSmoke();
}

main().catch((err) => {
  red("\n❌ go-live aborted");
  console.error(err);
  process.exit(1);
});
