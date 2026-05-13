import type { ChatMessage } from "./types";

export function extractStyleDNA(messages: ChatMessage[]): string {
  const sample = messages
    .filter((m) => m.role === "assistant")
    .slice(-3)
    .map((m) => m.content)
    .join("\n");
  if (!sample) return "";
  const tone = sample.length > 400 ? "detailed" : "concise";
  return `Prefer ${tone} replies; mirror user's formality.`;
}
