export function resonanceScore(text: string, replies: string[]): number {
  if (!replies.length) return 0;
  const words = new Set(text.toLowerCase().match(/\w{4,}/g) ?? []);
  let hit = 0;
  for (const r of replies) {
    for (const w of r.toLowerCase().match(/\w{4,}/g) ?? []) {
      if (words.has(w)) hit++;
    }
  }
  return Math.min(100, Math.round((hit / (replies.length * 8 + 1)) * 100));
}
