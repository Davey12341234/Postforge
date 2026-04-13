#!/usr/bin/env node
/**
 * Prints ✅/❌ for BabyGPT billing-related env vars (values never printed).
 * Reads .env + .env.local from repo root, then overlays process.env.
 */
const { ALL_ROWS } = require("./billing-env-keys.cjs");
const { loadMergedEnv } = require("./load-env-files.cjs");

const env = loadMergedEnv();
let group = null;
for (const row of ALL_ROWS) {
  if (row.group !== group) {
    group = row.group;
    console.log(`\n[${group}]`);
  }
  const v = env[row.key];
  const ok = v != null && String(v).trim() !== "";
  console.log(`  ${ok ? "✅" : "❌"} ${row.key}`);
}

console.log("\nStripe Checkout + Subscribe need: Gate + Stripe keys + price IDs + NEXT_PUBLIC_APP_URL.");
console.log("List prices are optional (modal shows “Price on checkout” if unset).\n");
