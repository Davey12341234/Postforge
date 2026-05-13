/**
 * Lightweight prompt merge — no extra LLM call (fast path).
 * Replace with LLM-based BrandKit enhancement when that model exists.
 */
export function mergeStyleHint(prompt: string, styleHint?: string): string {
  const p = prompt.trim();
  if (!styleHint?.trim()) return p;
  return `${p}\n\nStyle / brand context: ${styleHint.trim()}`;
}
