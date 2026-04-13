/**
 * Optional deployment gate: password login + server-side wallet.
 * When BABYGPT_APP_PASSWORD is unset, the app behaves as a local-first dev UI (no login).
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
  return normalizeEnvString(process.env.BABYGPT_APP_PASSWORD);
}

export function isGateEnabled(): boolean {
  return Boolean(getAppPassword());
}

export function getApiSecret(): string | undefined {
  return normalizeEnvString(process.env.BABYGPT_API_SECRET);
}

export function getSessionSecret(): string | undefined {
  return normalizeEnvString(process.env.BABYGPT_SESSION_SECRET);
}
