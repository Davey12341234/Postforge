#!/usr/bin/env node
/**
 * Lightweight snapshot for reviewers / other AIs: package name, scripts, API routes, src file count.
 * Output: docs/cursor-review-snapshot.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "cursor-review-snapshot.json");

function walk(dir, acc, skip) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith(".")) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (skip.some((s) => full.includes(s))) continue;
      walk(full, acc, skip);
    } else if (/\.(ts|tsx)$/.test(name.name)) {
      acc.push(path.relative(ROOT, full).replace(/\\/g, "/"));
    }
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
const srcFiles = [];
walk(path.join(ROOT, "src"), srcFiles, ["node_modules", ".next", "_archive"]);

const snapshot = {
  generatedAt: new Date().toISOString(),
  name: pkg.name,
  version: pkg.version,
  scripts: pkg.scripts,
  srcFileCount: srcFiles.length,
  sampleSrcFiles: srcFiles.slice(0, 40),
  apiRoutesHint: [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/chat",
    "/api/chat/agent",
    "/api/chat/schrodinger",
    "/api/community",
    "/api/community/debate",
    "/api/credits",
    "/api/stripe/checkout",
    "/api/stripe/portal",
    "/api/stripe/finalize",
    "/api/stripe/webhook",
    "/api/billing/copilot",
    "/api/billing/support",
    "/api/billing/translate",
  ],
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2), "utf-8");
console.log("Wrote", path.relative(ROOT, OUT));
