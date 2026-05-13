import { normalizeEmail } from "@/lib/email-normalize";

/** Exported for tests — same rules as magicLinkAllowlist() in magic-link-policy. */
export function parseMagicLinkEmailAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const n = normalizeEmail(part);
    if (n) set.add(n);
  }
  return set;
}
