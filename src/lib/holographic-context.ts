import type { ChatMessage } from "./types";

const MAX_CHARS = 12000;

export function buildHolographicMessages(
  messages: Pick<ChatMessage, "role" | "content">[],
  opts?: { enabled?: boolean },
): { role: "system" | "user" | "assistant"; content: string }[] {
  const base = messages.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));
  if (!opts?.enabled) return base;

  let total = base.reduce((n, m) => n + m.content.length, 0);
  if (total <= MAX_CHARS) return base;

  const kept: typeof base = [];
  for (let i = base.length - 1; i >= 0; i--) {
    kept.unshift(base[i]);
    total = kept.reduce((n, m) => n + m.content.length, 0);
    if (total > MAX_CHARS) {
      kept[0] = {
        ...kept[0],
        content: `[folded] ${kept[0].content.slice(-Math.floor(MAX_CHARS / 4))}`,
      };
      break;
    }
  }
  return kept;
}
