#!/usr/bin/env node
/**
 * Shows what's missing for paid checkout, then exact commands to finish.
 * Exit 0 = all required keys present in .env / .env.local (or env); 1 = gaps remain.
 */
const {
  REQUIRED_FOR_CHECKOUT,
  OPTIONAL_LIST_PRICES,
  OPTIONAL_STRIPE_YEARLY_PRICE_IDS,
} = require("./billing-env-keys.cjs");
const { loadMergedEnv } = require("./load-env-files.cjs");
const { isStripeSecretApiKey, validateStripeSecretKey } = require("./stripe-secret-valid.cjs");

const cwd = process.cwd();
const env = loadMergedEnv(cwd);

function present(key) {
  const v = env[key];
  return v != null && String(v).trim() !== "";
}

function gatePasswordOk() {
  return present("BBGPT_APP_PASSWORD") || present("BABYGPT_APP_PASSWORD");
}

function gateSessionOk() {
  return present("BBGPT_SESSION_SECRET") || present("BABYGPT_SESSION_SECRET");
}

function requiredMet(r) {
  if (r.key === "STRIPE_SECRET_KEY") return isStripeSecretApiKey(env.STRIPE_SECRET_KEY);
  if (r.key === "BBGPT_APP_PASSWORD") return gatePasswordOk();
  if (r.key === "BBGPT_SESSION_SECRET") return gateSessionOk();
  return present(r.key);
}

const missingRequired = REQUIRED_FOR_CHECKOUT.filter((r) => !requiredMet(r));

console.log("\n=== bbGPT — billing setup status ===\n");
console.log(`Working directory: ${cwd}\n`);

console.log("Required (Subscribe with Stripe + gate):");
for (const r of REQUIRED_FOR_CHECKOUT) {
  const ok = requiredMet(r);
  console.log(`  ${ok ? "✅" : "❌"} ${r.key}`);
  console.log(`      ${r.note}`);
  if (r.key === "STRIPE_SECRET_KEY" && present("STRIPE_SECRET_KEY") && !ok) {
    const v = validateStripeSecretKey(env.STRIPE_SECRET_KEY);
    if (!v.ok) console.log(`      Fix: ${v.reason}`);
  }
}

console.log("\nOptional (Plans modal prices + yearly Stripe IDs for annual Checkout):");
for (const r of [...OPTIONAL_LIST_PRICES, ...OPTIONAL_STRIPE_YEARLY_PRICE_IDS]) {
  console.log(`  ${present(r.key) ? "✅" : "❌"} ${r.key}`);
}

if (missingRequired.length > 0) {
  if (missingRequired.length === REQUIRED_FOR_CHECKOUT.length) {
    console.log(
      "\n  Note: All required keys are missing in this run. `vercel env pull` often stores `KEY=\"\"` for secrets; that does not confirm Production is empty. Open Vercel → postforge2 → Settings → Environment variables (Production) and cross-check. See also: deploy/LAUNCH-HANDOFF.md\n",
    );
  }
  console.log("\n--- Still to do ---\n");
  let n = 1;
  if (missingRequired.some((r) => r.key === "STRIPE_SECRET_KEY")) {
    console.log(
      `${n++}. STRIPE_SECRET_KEY: use the full Secret key from Stripe → Developers → API keys (starts with sk_test_ or sk_live_, ~100+ characters).`,
    );
  }
  if (isStripeSecretApiKey(env.STRIPE_SECRET_KEY) && missingRequired.some((r) => r.key.startsWith("STRIPE_PRICE_"))) {
    console.log(
      `${n++}. Create test products + prices:  npm run stripe:bootstrap:tiers  (then paste printed STRIPE_PRODUCT_* and STRIPE_PRICE_* lines into .env.local)`,
    );
  } else if (missingRequired.some((r) => r.key.startsWith("STRIPE_PRICE_"))) {
    console.log(
      `${n++}. Add monthly price_... IDs (or run  npm run stripe:bootstrap:tiers  after fixing STRIPE_SECRET_KEY).`,
    );
  }
  console.log(`${n++}. Optional: set NEXT_PUBLIC_PLAN_PRICE_*_YEARLY_USD to 120 / 240 / 690 and yearly STRIPE_PRICE_*_YEARLY for annual checkout (script prints suggested values).`);
  console.log(`${n++}. Re-run:  npm run finish:billing`);
  console.log("\n");
  process.exit(1);
}

console.log("\n--- Ready to push to Vercel ---\n");
console.log("All required keys are present in .env / .env.local (or environment).\n");

const isWin = process.platform === "win32";
if (isWin) {
  console.log("1) Push env to Vercel Production (requires npx vercel login + .vercel\\project.json):");
  console.log("     npm run vercel:env:prod\n");
  console.log("2) Deploy:");
  console.log("     npm run deploy:prod   (or:  npm run deploy:prod:fresh  to skip build cache)\n");
} else {
  console.log("1) Push env to Vercel (Node script, any OS):  npm run vercel:env:prod");
  console.log("   Or set the same keys in Vercel → Settings → Environment Variables → Production.\n");
  console.log("2) Deploy:");
  console.log("     npm run deploy:prod\n");
}

console.log(
  "3) Stripe Dashboard → Webhooks: confirm URL hits /api/stripe/webhook; include at least checkout.session.completed, customer.subscription.created|updated|deleted, invoice.paid, invoice.payment_failed.\n",
);
console.log("4) After login, verify GET /api/credits returns stripe.configured: true.");
console.log("5) Full operator checklist:  npm run online:steps\n");

process.exit(0);
