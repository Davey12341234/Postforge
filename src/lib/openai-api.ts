import type { ModelTier } from "./types";

const OPENAI_CHAT = "https://api.openai.com/v1/chat/completions";

/** Reasonable OpenAI model for each GLM tier (UI still shows GLM names). */
export const GLM_TO_OPENAI_MODEL: Record<ModelTier, string> = {
  "glm-4-flash": "gpt-4o-mini",
  "glm-4-air": "gpt-4o-mini",
  "glm-4-plus": "gpt-4o",
  "glm-4-long": "gpt-4o",
  "glm-4": "gpt-4o",
};

export function mapTierToOpenAIModel(tier: ModelTier): string {
  return GLM_TO_OPENAI_MODEL[tier] ?? "gpt-4o-mini";
}

export function getOpenAIApiKey(): string | null {
  const k = process.env.OPENAI_API_KEY?.trim();
  return k || null;
}

/** Parses OpenAI-compatible chat completion JSON (OpenAI + Z.AI GLM). */
export function pickChatTextFromCompletion(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const o = data as { choices?: unknown };
  const ch = o.choices;
  if (!Array.isArray(ch) || !ch[0] || typeof ch[0] !== "object") return "";
  const c0 = ch[0] as { message?: unknown };
  if (!c0.message || typeof c0.message !== "object") return "";
  const msg = c0.message as { content?: unknown };
  return typeof msg.content === "string" ? msg.content : "";
}

export async function openaiChatCompletionJson(opts: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<unknown> {
  const res = await fetch(OPENAI_CHAT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: false,
      temperature: 0.6,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text.slice(0, 800));
  }
  return JSON.parse(text) as unknown;
}

/** OpenAI SSE stream (OpenAI-compatible; client SSE parser already handles deltas). */
export async function streamOpenAIChat(opts: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(OPENAI_CHAT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t.slice(0, 800));
  }
  if (!res.body) throw new Error("OpenAI returned empty body");
  return res.body;
}
