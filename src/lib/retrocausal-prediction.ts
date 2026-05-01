/**
 * Optional follow-up ideas for the idle heartbeat. Keep this sparse — the UI
 * surfaces these as toasts; a vague default was prompting too often.
 */
export function predictNextUserIntent(lastUser: string): string[] {
  const q = lastUser.toLowerCase();
  const out: string[] = [];
  if (q.includes("code")) out.push("Ask for tests or edge cases");
  if (q.includes("explain")) out.push("Request a shorter summary");
  if (q.length < 40) out.push("Add constraints or examples");
  if (/\?|how do i|what is|why /.test(q)) out.push("Ask for a concrete example");
  // No generic fallback — avoids repetitive “objection” nags on normal messages.
  return out;
}
