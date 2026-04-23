#!/usr/bin/env node
/**
 * Prints ✅/❌ for bbGPT billing-related env vars (values never printed).
 * Reads .env + .env.local from repo root, then overlays process.env.
 */
const { ALL_ROWS } = require("./billing-env-keys.cjs");
const { loadMergedEnv } = require("./load-env-files.cjs");
const { isStripeSecretApiKey } = require("./stripe-secret-valid.cjs");

const env = loadMergedEnv();
let group = null;
for (const row of ALL_ROWS) {
  if (row.group !== group) {
    group = row.group;
    console.log(`\n[${group}]`);
  }
  const v = env[row.key];
  let ok = v != null && String(v).trim() !== "";
  if (row.key === "STRIPE_SECRET_KEY") ok = isStripeSecretApiKey(env.STRIPE_SECRET_KEY);
  console.log(`  ${ok ? "✅" : "❌"} ${row.key}`);
}

console.log("\nStripe Checkout + Subscribe need: Gate + Stripe keys + monthly price IDs + NEXT_PUBLIC_APP_URL.");
console.log("Annual Checkout also needs STRIPE_PRICE_*_YEARLY when using yearly prices in Stripe.");
console.log("LLM keys (Z_AI_API_KEY / OPENAI_API_KEY) are separate — set on Vercel for production chat.");
console.log("Dashboard-only: create Products/Prices, webhook endpoint, Signing secret — see docs/STRIPE-ACCOUNT-SETUP.md.\n");
