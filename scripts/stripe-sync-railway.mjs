/**
 * One-shot: create Postforge subscription prices + webhook in Stripe (live key from Railway),
 * then push STRIPE_PRICE_* and STRIPE_WEBHOOK_SECRET to the linked Railway service.
 *
 * Run from repo root:
 *   railway run -- node scripts/stripe-sync-railway.mjs
 *
 * Requires: Stripe account with no conflicting products, Railway CLI logged in + linked.
 */

import { execSync } from "node:child_process";

const BASE = "https://api.stripe.com/v1";

function publicAppUrl() {
  const d =
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "postforge-production-ce34.up.railway.app";
  if (d.startsWith("http")) return d.replace(/\/$/, "");
  return `https://${d.replace(/\/$/, "")}`;
}

const PUBLIC_APP = publicAppUrl();
const WEBHOOK_URL = `${PUBLIC_APP}/api/stripe/webhook`;

function form(body) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    if (k === "metadata" && typeof v === "object" && !Array.isArray(v)) {
      for (const [mk, mv] of Object.entries(v)) {
        p.append(`metadata[${mk}]`, String(mv));
      }
    } else {
      p.append(k, String(v));
    }
  }
  return p;
}

function encodeBody(params) {
  if (params instanceof URLSearchParams) return params.toString();
  if (typeof params === "string") return params;
  return form(params).toString();
}

async function stripeForm(path, params) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing (use: railway run -- node …)");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeBody(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Stripe ${path} failed: ${data.error?.message ?? JSON.stringify(data)}`,
    );
  }
  return data;
}

async function stripeGet(path) {
  const key = process.env.STRIPE_SECRET_KEY;
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Stripe GET ${path} failed: ${data.error?.message ?? JSON.stringify(data)}`,
    );
  }
  return data;
}

async function stripeDelete(path) {
  const key = process.env.STRIPE_SECRET_KEY;
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (!res.ok && !data.deleted) {
    throw new Error(
      `Stripe DELETE ${path} failed: ${data.error?.message ?? JSON.stringify(data)}`,
    );
  }
  return data;
}

function setRailwayVars(pairs) {
  for (const [k, v] of pairs) {
    console.error("Setting Railway variable:", k);
    // shell: true so `railway` resolves on Windows when spawned from Node inside `railway run`
    execSync(`railway variable set "${k}=${v.replace(/"/g, '\\"')}"`, {
      stdio: "inherit",
      shell: true,
    });
  }
}

async function main() {
  console.error("Using PUBLIC_APP / webhook:", WEBHOOK_URL);

  const products = await stripeGet("/products?active=true&limit=100");
  let product = (products.data ?? []).find((p) => p.name === "Postforge");
  if (!product) {
    product = await stripeForm("/products", {
      name: "Postforge",
      description: "Postforge unified studio subscription",
    });
  }
  console.error("Product:", product.id);

  const tiers = [
    ["pro", "2900"],
    ["business", "9900"],
    ["enterprise", "29900"],
  ];

  const existingPrices = await stripeGet(
    `/prices?active=true&limit=100&product=${product.id}`,
  );
  const byNickname = Object.fromEntries(
    (existingPrices.data ?? []).map((p) => [p.nickname, p]),
  );

  const priceIds = {};
  for (const [nickname, cents] of tiers) {
    let p = byNickname[nickname];
    if (
      !p ||
      String(p.unit_amount) !== cents ||
      p.recurring?.interval !== "month"
    ) {
      p = await stripeForm("/prices", {
        product: product.id,
        unit_amount: cents,
        currency: "usd",
        "recurring[interval]": "month",
        nickname,
        metadata: { postforge_plan: nickname },
      });
    }
    priceIds[nickname.toUpperCase()] = p.id;
    console.error(`Price ${nickname}:`, p.id);
  }

  const events = [
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ];

  const baseHost = PUBLIC_APP.replace(/\/$/, "");
  const existing = await stripeGet("/webhook_endpoints?limit=50");
  for (const w of existing.data ?? []) {
    const u = w.url ?? "";
    if (u.startsWith(baseHost)) {
      console.error("Removing webhook (will recreate):", w.id, w.url);
      await stripeDelete(`/webhook_endpoints/${w.id}`);
    }
  }

  const params = new URLSearchParams();
  params.set("url", WEBHOOK_URL);
  for (const e of events) params.append("enabled_events[]", e);

  const wh = await stripeForm("/webhook_endpoints", params);
  console.error("Webhook endpoint:", wh.id, "secret:", wh.secret ? "[set]" : "[missing]");

  if (!wh.secret) {
    throw new Error(
      "New webhook has no secret in API response; set STRIPE_WEBHOOK_SECRET manually in Stripe Dashboard.",
    );
  }

  setRailwayVars([
    ["STRIPE_PRICE_PRO", priceIds.PRO],
    ["STRIPE_PRICE_BUSINESS", priceIds.BUSINESS],
    ["STRIPE_PRICE_ENTERPRISE", priceIds.ENTERPRISE],
    ["STRIPE_WEBHOOK_SECRET", wh.secret],
  ]);

  console.error("Done. Redeploy on Railway if variables did not auto-restart the service.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
