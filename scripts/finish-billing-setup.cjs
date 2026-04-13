#!/usr/bin/env node
/**
 * Shows what's missing for paid checkout, then exact commands to finish.
 * Exit 0 = all required keys present in .env / .env.local (or env); 1 = gaps remain.
 */
const { REQUIRED_FOR_CHECKOUT, OPTIONAL_LIST_PRICES } = require("./billing-env-keys.cjs");
const { loadMergedEnv } = require("./load-env-files.cjs");

const cwd = process.cwd();
const env = loadMergedEnv(cwd);

function present(key) {
  const v = env[key];
  return v != null && String(v).trim() !== "";
}

const missingRequired = REQUIRED_FOR_CHECKOUT.filter((r) => !present(r.key));

console.log("\n=== BabyGPT — billing setup status ===\n");
console.log(`Working directory: ${cwd}\n`);

console.log("Required (Subscribe with Stripe + gate):");
for (const r of REQUIRED_FOR_CHECKOUT) {
  console.log(`  ${present(r.key) ? "✅" : "❌"} ${r.key}`);
  console.log(`      ${r.note}`);
}

console.log("\nOptional (Plans modal dollar amounts):");
for (const r of OPTIONAL_LIST_PRICES) {
  console.log(`  ${present(r.key) ? "✅" : "❌"} ${r.key}`);
}

if (missingRequired.length > 0) {
  console.log("\n--- Still to do ---\n");
  let n = 1;
  console.log(`${n++}. Copy .env.local.example → .env.local (or .env) and fill missing keys above.`);
  console.log(`${n++}. Stripe Dashboard: create Products/Prices → copy price_... IDs.`);
  console.log(`${n++}. Stripe → Webhooks → endpoint https://<your-host>/api/stripe/webhook → copy whsec_...`);
  console.log(`${n++}. Set NEXT_PUBLIC_APP_URL to your production URL (no trailing slash).`);
  console.log(`${n++}. Re-run: npm run finish:billing`);
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
  console.log("     npx vercel deploy --prod --yes\n");
} else {
  console.log("1) Vercel CLI env push is provided as PowerShell only. Either:");
  console.log("     - Run the same keys from your file in Vercel → Settings → Environment Variables → Production, or");
  console.log("     - Use WSL/PowerShell on Windows: npm run vercel:env:prod\n");
  console.log("2) Deploy:");
  console.log("     npx vercel deploy --prod --yes\n");
}

console.log(
  "3) Stripe Dashboard → Webhooks: confirm URL hits /api/stripe/webhook; include at least checkout.session.completed, customer.subscription.created|updated|deleted, invoice.paid, invoice.payment_failed.\n",
);
console.log("4) After login, verify GET /api/credits returns stripe.configured: true.\n");

process.exit(0);
