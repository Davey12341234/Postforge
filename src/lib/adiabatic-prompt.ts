export function adiabaticSystemPrompt(base: string, morph: number): string {
  const t = Math.max(0, Math.min(1, morph));
  const steer = t < 0.33 ? "explore" : t < 0.66 ? "balance" : "commit";
  return `${base}\nMode: ${steer} (${(t * 100).toFixed(0)}%).`;
}
