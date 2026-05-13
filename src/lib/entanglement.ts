export function entanglementHint(threadIds: string[]): string {
  if (threadIds.length < 2) return "";
  return `Linked threads: ${threadIds.slice(0, 3).join(", ")}`;
}
