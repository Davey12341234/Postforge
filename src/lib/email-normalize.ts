/** Lowercase trimmed email for comparisons and JWT claims. */
export function normalizeEmail(email: string | undefined | null): string | undefined {
  const s = String(email ?? "").trim().toLowerCase();
  return s.length > 0 ? s : undefined;
}
