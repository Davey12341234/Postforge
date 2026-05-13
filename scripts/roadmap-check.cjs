#!/usr/bin/env node
/**
 * Quick probes: default Vercel deployment URL + optional custom domain (bbgpt.ai).
 * Does not print secrets. Safe to run anytime.
 *
 * LAUNCH_SMOKE_URL=https://postforge2.vercel.app  — primary app URL for smoke-style checks
 * BBGPT_CUSTOM_DOMAIN_URL=https://www.bbgpt.ai   — extra probe for DNS / parking detection
 *
 * Usage: npm run roadmap:check
 */
const fs = require("fs");
const path = require("path");

const PRIMARY = (process.env.LAUNCH_SMOKE_URL || "https://postforge2.vercel.app").replace(/\/$/, "");
const CUSTOM = (process.env.BBGPT_CUSTOM_DOMAIN_URL || "https://www.bbgpt.ai").replace(/\/$/, "");

function looksLikeParking(html) {
  if (!html || html.length < 80) return false;
  return (
    /Namecheap\s+Parking|Parking\s+Page|nc-cpanel|successfully created on the server/i.test(html) ||
    (html.includes("Namecheap") && html.includes("Hosting account"))
  );
}

function looksLikeNextApp(html) {
  return typeof html === "string" && (html.includes("__NEXT_DATA__") || html.includes('id="__next"'));
}

async function probe(base, label) {
  const url = `${base}/`;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "text/html,*/*;q=0.8" },
      signal: AbortSignal.timeout(20000),
    });
    const html = await res.text();
    const parking = looksLikeParking(html);
    const nexty = looksLikeNextApp(html);
    let verdict = "unknown HTML";
    if (parking) verdict = "registrar / hosting parking — DNS not pointing at Vercel yet";
    else if (nexty) verdict = "likely Next.js app (good)";
    else if (res.ok) verdict = "HTTP OK (confirm in browser)";
    else verdict = `HTTP ${res.status}`;
    return {
      label,
      url,
      status: res.status,
      finalUrl: res.url,
      parking,
      nexty,
      verdict,
    };
  } catch (e) {
    return { label, url, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  console.log("\n=== bbGPT — roadmap:check (URLs only, no secrets) ===\n");

  const rows = [PRIMARY, CUSTOM].filter((u, i, a) => a.indexOf(u) === i);

  for (const base of rows) {
    const lbl =
      base === PRIMARY ? "Primary (LAUNCH_SMOKE_URL)" : "Custom (BBGPT_CUSTOM_DOMAIN_URL)";
    const r = await probe(base, lbl);
    if (r.error) {
      console.log(`${r.label}`);
      console.log(`  ${r.url}`);
      console.log(`  ❌ ${r.error}\n`);
      continue;
    }
    console.log(`${r.label}`);
    console.log(`  ${r.url} → ${r.status} (final: ${r.finalUrl})`);
    console.log(`  ${r.parking ? "⚠" : r.nexty ? "✅" : "•"} ${r.verdict}\n`);
  }

  const guide = path.join(__dirname, "..", "deploy", "OPERATOR-NEXT-STEPS-AND-BUILDUP.txt");
  if (fs.existsSync(guide)) {
    console.log(`Full roadmap file:\n  ${guide}\n`);
  }

  console.log(`Commands: npm run launch:smoke | npm run launch:follow-up | npm run online:steps\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
