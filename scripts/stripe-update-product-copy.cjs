#!/usr/bin/env node
/**
 * Push BabyGPT product name + description to Stripe via API (no Dashboard paste errors).
 * Copy is aligned with src/lib/plans.ts (paid tiers) and default list USD in .env.local.example.
 *
 * Usage (repo root; reads .env / .env.local for STRIPE_SECRET_KEY):
 *   node scripts/stripe-update-product-copy.cjs <product_id> <starter|pro|team>
 *   node scripts/stripe-update-product-copy.cjs --dry-run <product_id> <starter|pro|team>
 *
 * Example:
 *   node scripts/stripe-update-product-copy.cjs prod_UJQWPz2ZAYxGNX starter
 *
 * Sync all three products (set env to your three Stripe Product IDs):
 *   STRIPE_PRODUCT_STARTER=prod_... STRIPE_PRODUCT_PRO=prod_... STRIPE_PRODUCT_TEAM=prod_... ^
 *     node scripts/stripe-update-product-copy.cjs --all
 */
const Stripe = require("stripe");
const { loadMergedEnv } = require("./load-env-files.cjs");

/** Keep in sync with src/lib/plans.ts + NEXT_PUBLIC_PLAN_PRICE_*_USD defaults. */
const PAID = {
  starter: {
    listUsd: 12,
    name: "BabyGPT — Starter",
    subtitle: "Stronger models + agent tools",
    monthlyCredits: 4_000,
    blurb:
      "GLM-4 Flash, Air, and Plus. Includes thinking mode, agent tools, Kolmogorov & holographic quantum options, and community. Does not include dual-model race or DNA trace.",
  },
  pro: {
    listUsd: 24,
    name: "BabyGPT — Pro",
    subtitle: "Full stack: dual-model, DNA, long context",
    monthlyCredits: 25_000,
    blurb:
      "All GLM tiers including long context and flagship. Full quantum set, Two models (dual-model race), DNA trace, agent tools, and community.",
  },
  team: {
    listUsd: 69,
    name: "BabyGPT — Team",
    subtitle: "Same capabilities as Pro — higher monthly pool",
    monthlyCredits: 80_000,
    blurb:
      "Same models and features as Pro with a larger monthly credit pool for heavier use.",
  },
};

function buildDescription(key) {
  const p = PAID[key];
  return [
    p.subtitle,
    "",
    `About ${p.monthlyCredits.toLocaleString("en-US")} credits per month in-app (BabyGPT bookkeeping).`,
    `Public list price: $${p.listUsd}/month — must match the recurring Price in Stripe and NEXT_PUBLIC_PLAN_PRICE_${key.toUpperCase()}_USD.`,
    "",
    p.blurb,
  ].join("\n");
}

function usage() {
  console.error(`
Usage:
  node scripts/stripe-update-product-copy.cjs [--dry-run] <product_id> <starter|pro|team>
  STRIPE_PRODUCT_STARTER=... STRIPE_PRODUCT_PRO=... STRIPE_PRODUCT_TEAM=... node scripts/stripe-update-product-copy.cjs --all [--dry-run]

Requires STRIPE_SECRET_KEY in .env.local or environment (sk_test_... or sk_live_...).
`);
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  let dryRun = false;
  if (argv[0] === "--dry-run") {
    dryRun = true;
    argv.shift();
  }

  const env = loadMergedEnv(process.cwd());
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey && !dryRun) {
    console.error("Missing STRIPE_SECRET_KEY. Add it to .env.local or export it.");
    process.exit(1);
  }

  if (argv[0] === "--all") {
    const ids = {
      starter: env.STRIPE_PRODUCT_STARTER?.trim(),
      pro: env.STRIPE_PRODUCT_PRO?.trim(),
      team: env.STRIPE_PRODUCT_TEAM?.trim(),
    };
    const missing = Object.entries(ids).filter(([, v]) => !v);
    if (missing.length) {
      console.error(
        "For --all, set STRIPE_PRODUCT_STARTER, STRIPE_PRODUCT_PRO, STRIPE_PRODUCT_TEAM to each Product ID (prod_...).",
      );
      process.exit(1);
    }
    for (const tier of ["starter", "pro", "team"]) {
      await updateOne(secretKey, ids[tier], tier, dryRun);
    }
    return;
  }

  if (argv.length < 2) usage();
  const [productId, tier] = argv;
  if (!PAID[tier]) {
    console.error(`Unknown tier "${tier}". Use: starter | pro | team`);
    process.exit(1);
  }
  await updateOne(secretKey, productId, tier, dryRun);
}

async function updateOne(secretKey, productId, tier, dryRun) {
  const p = PAID[tier];
  const name = p.name;
  const description = buildDescription(tier);
  const payload = { name, description };

  console.log(`\n--- ${tier} (${productId}) ---`);
  console.log(JSON.stringify(payload, null, 2));

  if (dryRun) {
    console.log("(dry-run: not calling Stripe)");
    return;
  }

  const stripe = new Stripe(secretKey);
  const updated = await stripe.products.update(productId, payload);
  console.log("Updated:", updated.id, updated.name);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
