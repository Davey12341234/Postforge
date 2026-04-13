import type { ChatMessage, ModelTier } from "./types";

function approxComplexity(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const words = t.split(/\s+/).length;
  const unique = new Set(t.toLowerCase().match(/\w+/g) ?? []).size;
  return words * 0.6 + unique * 0.4;
}

export type TaskSignal =
  | "web"
  | "code"
  | "creative"
  | "long_context"
  | "general";

export function classifyTaskSignals(text: string): TaskSignal[] {
  const t = text.toLowerCase();
  const out: TaskSignal[] = [];
  if (
    /\b(search|latest|news|today|current|url|http|https|website|web)\b/.test(t) ||
    t.includes("look up")
  ) {
    out.push("web");
  }
  if (
    /\b(code|function|debug|stack trace|typescript|javascript|python|implement|refactor|eval|execute)\b/.test(
      t,
    ) ||
    /```/.test(t)
  ) {
    out.push("code");
  }
  if (/\b(story|poem|creative|write a|tone|voice|novel)\b/.test(t)) {
    out.push("creative");
  }
  if (t.length > 3500 || /\b(entire|full document|long context|summarize this wall)\b/.test(t)) {
    out.push("long_context");
  }
  if (!out.length) out.push("general");
  return out;
}

export function routeWithKolmogorov(
  preferred: ModelTier,
  messages: Pick<ChatMessage, "role" | "content">[],
  enabled?: boolean,
): ModelTier {
  return routeWithKolmogorovDetailed(preferred, messages, enabled).model;
}

export function routeWithKolmogorovDetailed(
  preferred: ModelTier,
  messages: Pick<ChatMessage, "role" | "content">[],
  enabled?: boolean,
): { model: ModelTier; reason: string } {
  if (!enabled) {
    return { model: preferred, reason: "Kolmogorov router off — using selected model" };
  }
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = lastUser?.content ?? "";
  const signals = classifyTaskSignals(text);
  const c = lastUser ? approxComplexity(text) : 0;

  if (signals.includes("long_context") || c > 120) {
    return {
      model: "glm-4-long",
      reason: "Routed to GLM-4 Long for long context / very large prompts",
    };
  }
  if (signals.includes("web")) {
    return { model: "glm-4-flash", reason: "Routed to Flash for web-grounded, fast lookups" };
  }
  if (signals.includes("code")) {
    return {
      model: "glm-4-plus",
      reason: "Routed to Plus for code / tool reasoning (enable Thinking for hardest bugs)",
    };
  }
  if (signals.includes("creative")) {
    return { model: "glm-4", reason: "Routed to GLM-4 for richer creative writing" };
  }
  if (c > 60) return { model: "glm-4", reason: "Routed to GLM-4 for deeper reasoning (high complexity)" };
  if (c > 25) return { model: "glm-4-plus", reason: "Routed to Plus for moderate complexity" };
  return { model: "glm-4-air", reason: "Routed to Air for balanced general chat" };
}
