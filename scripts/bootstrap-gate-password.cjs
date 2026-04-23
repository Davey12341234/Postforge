#!/usr/bin/env node
/**
 * Generates a gate password, writes BBGPT_APP_PASSWORD to .env.local (gitignored),
 * and pushes BBGPT_APP_PASSWORD to Vercel Production.
 *
 * Usage:
 *   npm run bootstrap:gate              # only when no gate password in merged env
 *   npm run bootstrap:gate -- --force   # reset: remove old BBGPT_/BABYGPT_ app password lines, set new
 */
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { loadMergedEnv } = require("./load-env-files.cjs");

const ROOT = path.join(__dirname, "..");
const force = process.argv.includes("--force");

function gateOk(env) {
  const p = env.BBGPT_APP_PASSWORD ?? env.BABYGPT_APP_PASSWORD;
  return p != null && String(p).trim() !== "";
}

function vercelEnvAdd(name, value, sensitive) {
  const bin = process.platform === "win32" ? "npx.cmd" : "npx";
  const args = ["vercel@latest", "env", "add", name, "production", "--yes", "--force"];
  if (sensitive) args.push("--sensitive");
  args.push("--value", value);
  const r = spawnSync(bin, args, {
    cwd: ROOT,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, CI: "true", VERCEL_TELEMETRY_DISABLED: "1" },
    shell: process.platform === "win32",
  });
  if (r.status !== 0 && r.status !== null) throw new Error(`vercel env add failed for ${name}`);
}

/** Remove active assignments for app gate keys (not session keys). */
function stripGatePasswordAssignments(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => {
      const code = line.split("#")[0].trim();
      if (!code) return true;
      const eq = code.indexOf("=");
      if (eq <= 0) return true;
      const key = code.slice(0, eq).trim();
      return key !== "BBGPT_APP_PASSWORD" && key !== "BABYGPT_APP_PASSWORD";
    })
    .join("\n")
    .replace(/\s+$/, "");
}

function main() {
  const env = loadMergedEnv(ROOT);
  if (!force && gateOk(env)) {
    console.error("Gate password already configured — use: npm run bootstrap:gate -- --force\n");
    process.exit(0);
  }

  const pw = crypto.randomBytes(24).toString("base64url");
  const localPath = path.join(ROOT, ".env.local");

  let raw = "";
  if (fs.existsSync(localPath)) raw = fs.readFileSync(localPath, "utf8");
  raw = stripGatePasswordAssignments(raw);
  const sep = raw.length && !raw.endsWith("\n") ? "\n" : "";
  const stamp = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(
    localPath,
    `${raw}${sep}\n# Gate password (${force ? "reset" : "bootstrap"}) ${stamp} — sign in at /login\nBBGPT_APP_PASSWORD=${pw}\n`,
    "utf8",
  );

  console.error("Updated .env.local with new BBGPT_APP_PASSWORD (gitignored).\nSetting Vercel Production...");
  vercelEnvAdd("BBGPT_APP_PASSWORD", pw, true);
  console.error(
    "Done. Use the value on the BBGPT_APP_PASSWORD= line in .env.local to sign in (do not share or commit).\n",
  );
}

main();
