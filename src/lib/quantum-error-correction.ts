import type { ErrorCorrectionLogEntry } from "./types";

export function correctDraft(text: string): string {
  let t = text.replace(/\s+\n/g, "\n").trim();
  if (t.endsWith("...") && t.length > 20) {
    t = `${t.slice(0, -3).trimEnd()}…`;
  }
  return t;
}

export function looksLikeRateLimitMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("429") ||
    m.includes("too many requests") ||
    m.includes("quota")
  );
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: { log: (e: ErrorCorrectionLogEntry) => void; maxRetries?: number },
): Promise<T> {
  const max = opts.maxRetries ?? 3;
  let delay = 400;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isRate = looksLikeRateLimitMessage(msg);
      opts.log({
        at: Date.now(),
        kind: isRate ? "rate_limit" : "api_malformed",
        detail: msg.slice(0, 500),
      });
      if (!isRate || i === max - 1) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 8000);
    }
  }
  throw new Error("withBackoff: unreachable");
}

export async function executeToolWithRetry(
  run: () => Promise<string>,
  opts: { log: (e: ErrorCorrectionLogEntry) => void },
): Promise<string> {
  try {
    return await run();
  } catch (e) {
    opts.log({
      at: Date.now(),
      kind: "tool_retry",
      detail: e instanceof Error ? e.message : String(e),
    });
    try {
      return await run();
    } catch (e2) {
      return `tool error: ${e2 instanceof Error ? e2.message : String(e2)}`;
    }
  }
}

export function tryRepairJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = candidate.slice(start, end + 1);
  try {
    JSON.parse(slice);
    return slice;
  } catch {
    return null;
  }
}
