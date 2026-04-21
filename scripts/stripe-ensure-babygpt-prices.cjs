#!/usr/bin/env node
/**
 * Create missing recurring monthly USD prices ($12 / $24 / $69) on a Stripe Product and print env lines.
 *
 * Reads .env / .env.local. Requires STRIPE_SECRET_KEY (sk_test_... or sk_live_...).
 *
 * Single product (three prices on one product — typical):
 *   STRIPE_BABYGPT_PRODUCT_ID=prod_... node scripts/stripe-ensure-babygpt-prices.cjs
 *
 * Or one product per tier:
 *   STRIPE_PRODUCT_STARTER=prod_... STRIPE_PRODUCT_PRO=prod_... STRIPE_PRODUCT_TEAM=prod_... node ...
 */
const Stripe = require("stripe");
const { loadMergedEnv } = require("./load-env-files.cjs");

const TIERS = [
  { envKey: "STRIPE_PRICE_STARTER", productEnv: "STRIPE_PRODUCT_STARTER", usd: 12, cents: 1200 },
  { envKey: "STRIPE_PRICE_PRO", productEnv: "STRIPE_PRODUCT_PRO", usd: 24, cents: 2400 },
  { envKey: "STRIPE_PRICE_TEAM", productEnv: "STRIPE_PRODUCT_TEAM", usd: 69, cents: 6900 },
];

async function main() {
  const env = loadMergedEnv(process.cwd());
  const secret = env.STRIPE_SECRET_KEY?.trim();
  if (!secret || !secret.startsWith("sk_")) {
    console.error(
      "Missing or invalid STRIPE_SECRET_KEY. Use the Secret key from Stripe Dashboard → Developers → API keys (starts with sk_test_ or sk_live_).",
    );
    process.exit(1);
  }

  const single = env.STRIPE_BABYGPT_PRODUCT_ID?.trim();
  const stripe = new Stripe(secret);

  const out = {};

  for (const t of TIERS) {
    const productId = env[t.productEnv]?.trim() || single;
    if (!productId) {
      console.error(
        `Set STRIPE_BABYGPT_PRODUCT_ID=prod_... (one product for all tiers) or set ${t.productEnv} for each tier.`,
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
        p.recurring?.interval === "month" &&
        p.unit_amount === t.cents &&
        p.type === "recurring",
    );

    if (!match) {
      match = await stripe.prices.create({
        product: productId,
        currency: "usd",
        unit_amount: t.cents,
        recurring: { interval: "month" },
        nickname: `BabyGPT ${t.envKey.replace("STRIPE_PRICE_", "")} $${t.usd}/mo`,
      });
      console.error(`Created price ${match.id} ($${t.usd}/mo) on ${productId}`);
    } else {
      console.error(`OK existing price ${match.id} ($${t.usd}/mo) on ${productId}`);
    }

    out[t.envKey] = match.id;
  }

  console.error("\n--- Add these lines to .env.local (or merge with existing) ---\n");
  for (const t of TIERS) {
    console.log(`${t.envKey}=${out[t.envKey]}`);
  }
  console.error("\nThen: npm run finish:billing && npm run vercel:env:prod (optional deploy)\n");
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
