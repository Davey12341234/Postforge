/**
 * Load .env then .env.local from cwd; process.env wins (for CI overrides).
 */
const fs = require("fs");
const path = require("path");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function loadMergedEnv(cwd = process.cwd()) {
  const base = parseEnvFile(path.join(cwd, ".env"));
  const local = parseEnvFile(path.join(cwd, ".env.local"));
  return { ...base, ...local, ...process.env };
}

module.exports = { loadMergedEnv, parseEnvFile };
