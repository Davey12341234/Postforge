import { sql } from "drizzle-orm";

import { normalizeEmail } from "@/lib/email-normalize";
import { getDb } from "@/lib/db";
import { userWallets } from "@/lib/db/schema";
import { parseMagicLinkEmailAllowlist } from "@/lib/magic-link-allowlist-parse";

/** Comma-separated allowlist: BBGPT_MAGIC_LINK_EMAILS=a@b.com,c@d.com */
function magicLinkAllowlist(): Set<string> {
  return parseMagicLinkEmailAllowlist(process.env.BBGPT_MAGIC_LINK_EMAILS);
}

async function walletRowExistsForEmail(normalized: string): Promise<boolean> {
  try {
    const db = getDb();
    const rows = await db
      .select({ id: userWallets.id })
      .from(userWallets)
      .where(sql`LOWER(TRIM(${userWallets.email})) = ${normalized}`)
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Whether this address may receive a passwordless sign-in link (magic link). */
export async function isEmailEligibleForMagicLink(emailRaw: string): Promise<boolean> {
  const normalized = normalizeEmail(emailRaw);
  if (!normalized) return false;

  if (magicLinkAllowlist().has(normalized)) return true;

  return walletRowExistsForEmail(normalized);
}
