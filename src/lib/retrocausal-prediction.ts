export function predictNextUserIntent(lastUser: string): string[] {
  const q = lastUser.toLowerCase();
  const out: string[] = [];
  if (q.includes("code")) out.push("Ask for tests or edge cases");
  if (q.includes("explain")) out.push("Request a shorter summary");
  if (q.length < 40) out.push("Add constraints or examples");
  if (!out.length) out.push("Iterate on the strongest objection");
  return out;
}
