#!/usr/bin/env node
/**
 * Adds missing bbGPT-related env keys to `.env.local` as empty assignments (KEY=)
 * so you can paste secrets without hunting variable names. Never overwrites existing lines.
 *
 * Usage: npm run env:scaffold
 */
const fs = require("fs");
const path = require("path");

const {
  REQUIRED_FOR_CHECKOUT,
  OPTIONAL_LIST_PRICES,
  OPTIONAL_STRIPE_YEARLY_PRICE_IDS,
  OPTIONAL_STRIPE_TUNING,
} = require("./billing-env-keys.cjs");

/** Extra keys not in billing-env-keys (production chat, Stripe helper). */
const EXTRA_KEYS = [
  { key: "Z_AI_BASE_URL", comment: "optional; defaults in app if unset" },
  { key: "Z_AI_API_KEY", comment: "" },
  { key: "OPENAI_API_KEY", comment: "" },
  { key: "BBGPT_API_SECRET", comment: "optional Bearer for scripted API calls (legacy: BABYGPT_API_SECRET)" },
  {
    key: "STRIPE_BBGPT_PRODUCT_ID",
    comment: "prod_… one Stripe Product for stripe:ensure-prices (legacy: STRIPE_BABYGPT_PRODUCT_ID)",
  },
];

function parseDefinedKeys(raw) {
  const keys = new Set();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    keys.add(t.slice(0, eq).trim());
  }
  return keys;
}

function main() {
  const root = process.cwd();
  const target = path.join(root, ".env.local");
  let existing = "";
  if (fs.existsSync(target)) {
    existing = fs.readFileSync(target, "utf8");
  }

  const defined = parseDefinedKeys(existing);

  const rows = [
    ...REQUIRED_FOR_CHECKOUT.map((r) => ({ key: r.key, note: r.note })),
    ...OPTIONAL_LIST_PRICES.map((r) => ({ key: r.key, note: r.note })),
    ...OPTIONAL_STRIPE_YEARLY_PRICE_IDS.map((r) => ({ key: r.key, note: r.note })),
    ...OPTIONAL_STRIPE_TUNING.map((r) => ({ key: r.key, note: r.note })),
    ...OPTIONAL_GEMINI.map((r) => ({ key: r.key, note: r.note })),
    ...OPTIONAL_EMAIL_RESEND.map((r) => ({ key: r.key, note: r.note })),
    ...OPTIONAL_AUTH_FLAGS.map((r) => ({ key: r.key, note: r.note })),
    ...EXTRA_KEYS.map((e) => ({ key: e.key, note: e.comment })),
  ];

  const toAdd = [];
  const seen = new Set();
  for (const row of rows) {
    const k = row.key;
    if (seen.has(k)) continue;
    seen.add(k);
    if (defined.has(k)) continue;
    toAdd.push(row);
  }

  if (toAdd.length === 0) {
    console.log(".env.local already defines all scaffold keys (nothing appended).\n");
    process.exit(0);
  }

  const block = [
    "",
    "# --- scaffold (npm run env:scaffold): paste values after = ---",
    ...toAdd.map((r) => `${r.key}=`),
    "",
  ].join("\n");

  fs.appendFileSync(target, block, "utf8");
  console.log(`Appended ${toAdd.length} empty key(s) to .env.local:`);
  for (const r of toAdd) console.log(`  - ${r.key}`);
  console.log("\nFill values, then: npm run finish:billing && npm run stripe:ensure-prices (needs STRIPE_SECRET_KEY)\n");
}

main();
