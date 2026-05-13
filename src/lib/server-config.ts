/**
 * Optional deployment gate: password login + server-side wallet.
 * Canonical env: `BBGPT_*`. Legacy `BABYGPT_*` is still read when the new key is unset.
 * When no app password is set, the app behaves as a local-first dev UI (no login).
 */

/** Trim and strip a single pair of surrounding quotes (common .env copy/paste mistake). */
function normalizeEnvString(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  let s = raw.trim();
  if (!s) return undefined;
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

/** Resolved app password for login comparison (undefined if gate should be off). */
export function getAppPassword(): string | undefined {
  return normalizeEnvString(process.env.BBGPT_APP_PASSWORD ?? process.env.BABYGPT_APP_PASSWORD);
}

/** Email/password accounts + per-user wallets (`BBGPT_USER_AUTH=1`, requires Postgres). */
export function isUserAuthEnabled(): boolean {
  return process.env.BBGPT_USER_AUTH?.trim() === "1";
}

/** Gate on when session secret exists and either legacy shared password or user auth mode is enabled. */
export function isGateEnabled(): boolean {
  if (!getSessionSecret()) return false;
  return Boolean(getAppPassword()) || isUserAuthEnabled();
}

export function getApiSecret(): string | undefined {
  return normalizeEnvString(process.env.BBGPT_API_SECRET ?? process.env.BABYGPT_API_SECRET);
}

export function getSessionSecret(): string | undefined {
  return normalizeEnvString(process.env.BBGPT_SESSION_SECRET ?? process.env.BABYGPT_SESSION_SECRET);
}
