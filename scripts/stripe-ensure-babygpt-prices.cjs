#!/usr/bin/env node
/**
 * Create bbGPT Stripe Prices (and optionally Products) + print env lines for .env.local
 *
 * Amounts match the app defaults (src/lib/plan-pricing-display.ts):
 *   Monthly: $12 / $24 / $69   Yearly: $120 / $240 / $690
 *
 * Reads .env / .env.local. Requires STRIPE_SECRET_KEY (paste from Dashboard → Developers → API keys).
 *
 * Test vs Live: whatever key you use is the mode — sk_test_* = Test mode catalog, sk_live_* = Live.
 *
 * Usage
 * -----
 * One Product, six Prices (simplest — one STRIPE_BBGPT_PRODUCT_ID env var; legacy STRIPE_BABYGPT_PRODUCT_ID):
 *   npm run stripe:bootstrap
 *
 * Three Products (Starter / Pro / Team — clearer in Stripe catalog):
 *   npm run stripe:bootstrap:tiers
 *
 * If you already have a product ID:
 *   STRIPE_BBGPT_PRODUCT_ID=prod_... npm run stripe:ensure-prices
 *
 * Flags (advanced):
 *   --create-product     Create one "bbGPT" product if STRIPE_BBGPT_PRODUCT_ID / STRIPE_BABYGPT_PRODUCT_ID is unset
 *   --three-products     Create three tier products + all prices (do not combine with --create-product)
 *   --monthly-only
 *   --yearly-only
 */
const Stripe = require("stripe");
const { loadMergedEnv } = require("./load-env-files.cjs");
const { validateStripeSecretKey } = require("./stripe-secret-valid.cjs");

const MONTHLY_TIERS = [
  { envKey: "STRIPE_PRICE_STARTER", productEnv: "STRIPE_PRODUCT_STARTER", usd: 12, cents: 1200 },
  { envKey: "STRIPE_PRICE_PRO", productEnv: "STRIPE_PRODUCT_PRO", usd: 24, cents: 2400 },
  { envKey: "STRIPE_PRICE_TEAM", productEnv: "STRIPE_PRODUCT_TEAM", usd: 69, cents: 6900 },
];

const YEARLY_TIERS = [
  {
    envKey: "STRIPE_PRICE_STARTER_YEARLY",
    productEnv: "STRIPE_PRODUCT_STARTER",
    usd: 120,
    cents: 12000,
  },
  {
    envKey: "STRIPE_PRICE_PRO_YEARLY",
    productEnv: "STRIPE_PRODUCT_PRO",
    usd: 240,
    cents: 24000,
  },
  {
    envKey: "STRIPE_PRICE_TEAM_YEARLY",
    productEnv: "STRIPE_PRODUCT_TEAM",
    usd: 690,
    cents: 69000,
  },
];

function parseArgs() {
  const a = process.argv.slice(2);
  return {
    monthlyOnly: a.includes("--monthly-only"),
    yearlyOnly: a.includes("--yearly-only"),
    createProduct: a.includes("--create-product"),
    threeProducts: a.includes("--three-products"),
  };
}

function stripeModeLabel(secret) {
  if (!secret) return "UNKNOWN";
  if (secret.startsWith("sk_test")) return "TEST (Dashboard toggle: Test mode)";
  if (secret.startsWith("sk_live")) return "LIVE (Dashboard toggle: Live mode)";
  return "UNKNOWN";
}

/**
 * @param {{ envKey: string; productEnv: string; usd: number; cents: number }} t
 * @param {"month"|"year"} interval
 */
async function ensurePrice(stripe, env, t, interval) {
  const single = env.STRIPE_BBGPT_PRODUCT_ID?.trim() || env.STRIPE_BABYGPT_PRODUCT_ID?.trim();
  const productId = env[t.productEnv]?.trim() || single;
  if (!productId) {
    console.error(
      `Missing Product for ${t.envKey}. Run npm run stripe:bootstrap or stripe:bootstrap:tiers, or set STRIPE_BBGPT_PRODUCT_ID / STRIPE_BABYGPT_PRODUCT_ID / ${t.productEnv}.`,
    );
    process.exit(1);
  }

  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  let match = existing.data.find(
    (p) =>
      p.currency === "usd" &&
      p.recurring?.interval === interval &&
      p.unit_amount === t.cents &&
      p.type === "recurring",
  );

  const label = interval === "month" ? "mo" : "yr";
  if (!match) {
    match = await stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: t.cents,
      recurring: { interval },
      nickname: `bbGPT ${t.envKey.replace("STRIPE_PRICE_", "").replace("_YEARLY", "")} $${t.usd}/${label}`,
    });
    console.error(`Created ${interval}ly price ${match.id} ($${t.usd}/${label}) on ${productId}`);
  } else {
    console.error(`OK existing ${interval}ly price ${match.id} ($${t.usd}/${label}) on ${productId}`);
  }

  return match.id;
}

/** @returns {Promise<string[]>} lines to print (product id env vars) */
async function ensureProductsCreated(stripe, env, { createProduct, threeProducts }) {
  const lines = [];

  if (threeProducts) {
    console.error("\n--- Creating / using three tier Products (Starter, Pro, Team) ---\n");
    const defs = [
      { key: "STRIPE_PRODUCT_STARTER", name: "bbGPT Starter", meta: { bbgpt_tier: "starter" } },
      { key: "STRIPE_PRODUCT_PRO", name: "bbGPT Pro", meta: { bbgpt_tier: "pro" } },
      { key: "STRIPE_PRODUCT_TEAM", name: "bbGPT Team", meta: { bbgpt_tier: "team" } },
    ];
    for (const d of defs) {
      let pid = env[d.key]?.trim();
      if (!pid) {
        const p = await stripe.products.create({
          name: d.name,
          description: "bbGPT subscription tier",
          metadata: d.meta,
        });
        pid = p.id;
        env[d.key] = pid;
        console.error(`Created product ${pid} (${d.name})`);
        lines.push(`${d.key}=${pid}`);
      } else {
        console.error(`Using existing ${d.key}=${pid}`);
      }
    }
    return lines;
  }

  if (createProduct && !env.STRIPE_BBGPT_PRODUCT_ID?.trim() && !env.STRIPE_BABYGPT_PRODUCT_ID?.trim()) {
    console.error("\n--- Creating single bbGPT Product (all six prices attach here) ---\n");
    const product = await stripe.products.create({
      name: "bbGPT",
      description: "bbGPT — Starter, Pro, Team (monthly and annual)",
      metadata: { app: "bbgpt", catalog: "single-product" },
    });
    env.STRIPE_BBGPT_PRODUCT_ID = product.id;
    console.error(`Created product ${product.id} (bbGPT)`);
    lines.push(`STRIPE_BBGPT_PRODUCT_ID=${product.id}`);
    return lines;
  }

  return lines;
}

function assertHasProductRefs(env) {
  const single = env.STRIPE_BBGPT_PRODUCT_ID?.trim() || env.STRIPE_BABYGPT_PRODUCT_ID?.trim();
  const tier = env.STRIPE_PRODUCT_STARTER?.trim();
  if (!single && !tier) {
    console.error(
      "\nNo Product IDs in env. Run:\n  npm run stripe:bootstrap\n  npm run stripe:bootstrap:tiers\nOr set STRIPE_BBGPT_PRODUCT_ID / STRIPE_BABYGPT_PRODUCT_ID (or STRIPE_PRODUCT_STARTER / PRO / TEAM).\n",
    );
    process.exit(1);
  }
}

async function main() {
  const { monthlyOnly, yearlyOnly, createProduct, threeProducts } = parseArgs();

  if (monthlyOnly && yearlyOnly) {
    console.error("Use only one of --monthly-only or --yearly-only.");
    process.exit(1);
  }

  if (createProduct && threeProducts) {
    console.error("Use only one of --create-product or --three-products.");
    process.exit(1);
  }

  const env = loadMergedEnv(process.cwd());
  const secret = env.STRIPE_SECRET_KEY?.trim();
  const keyCheck = validateStripeSecretKey(secret);
  if (!keyCheck.ok) {
    console.error(`Invalid STRIPE_SECRET_KEY: ${keyCheck.reason}\n`);
    console.error(
      "Add to .env.local (single line, no quotes needed unless the key contains spaces):\n  STRIPE_SECRET_KEY=sk_test_...\nStripe Dashboard: Developers → API keys → Reveal secret key.\nTest vs Live: sk_test = test catalog only, sk_live = live catalog only.\n",
    );
    process.exit(1);
  }

  console.error(`\nStripe mode: ${stripeModeLabel(secret)}\n`);

  const stripe = new Stripe(secret);

  const productLines = await ensureProductsCreated(stripe, env, { createProduct, threeProducts });
  assertHasProductRefs(env);

  const runMonthly = !yearlyOnly;
  const runYearly = !monthlyOnly;

  const out = {};

  if (runMonthly) {
    for (const t of MONTHLY_TIERS) {
      out[t.envKey] = await ensurePrice(stripe, env, t, "month");
    }
  }

  if (runYearly) {
    for (const t of YEARLY_TIERS) {
      out[t.envKey] = await ensurePrice(stripe, env, t, "year");
    }
  }

  console.error("\n--- Paste into .env.local (merge with existing; values only from THIS Stripe mode) ---\n");

  if (productLines.length) {
    for (const line of productLines) console.log(line);
    console.log("");
  }

  const keysOrdered = [
    ...(runMonthly ? MONTHLY_TIERS.map((x) => x.envKey) : []),
    ...(runYearly ? YEARLY_TIERS.map((x) => x.envKey) : []),
  ];
  for (const k of keysOrdered) {
    if (out[k]) console.log(`${k}=${out[k]}`);
  }

  if (runYearly) {
    console.error("\n--- Optional public annual list prices (Plans modal) ---\n");
    console.log("NEXT_PUBLIC_PLAN_PRICE_STARTER_YEARLY_USD=120");
    console.log("NEXT_PUBLIC_PLAN_PRICE_PRO_YEARLY_USD=240");
    console.log("NEXT_PUBLIC_PLAN_PRICE_TEAM_YEARLY_USD=690");
  }

  console.error("\n--- Optional public monthly list prices ---\n");
  console.log("NEXT_PUBLIC_PLAN_PRICE_STARTER_USD=12");
  console.log("NEXT_PUBLIC_PLAN_PRICE_PRO_USD=24");
  console.log("NEXT_PUBLIC_PLAN_PRICE_TEAM_USD=69");

  console.error("\nThen: npm run finish:billing && npm run vercel:env:prod\n");
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
