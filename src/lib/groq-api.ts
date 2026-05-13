const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_CHAT = `${GROQ_BASE}/chat/completions`;

export const GROQ_CLAUDE_MODEL_MAP: Record<string, string> = {
  "claude-haiku": "llama-3.1-8b-instant",
  "claude-sonnet": "llama-3.3-70b-versatile",
  "claude-opus": "llama-3.3-70b-versatile",
};

export function getGroqApiKey(): string | null {
  return process.env.GROQ_API_KEY?.trim() || null;
}

export async function streamGroqChat(opts: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<ReadableStream<Uint8Array>> {
  const groqModel =
    GROQ_CLAUDE_MODEL_MAP[opts.model] ?? GROQ_CLAUDE_MODEL_MAP["claude-sonnet"];
  const res = await fetch(GROQ_CHAT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      messages: opts.messages,
      stream: true,
      max_tokens: 8192,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq API error ${res.status}: ${t.slice(0, 800)}`);
  }
  if (!res.body) throw new Error("Groq returned empty body");
  return res.body;
}

export async function groqChatCompletionJson(opts: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<string> {
  const groqModel =
    GROQ_CLAUDE_MODEL_MAP[opts.model] ?? GROQ_CLAUDE_MODEL_MAP["claude-sonnet"];
  const res = await fetch(GROQ_CHAT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      messages: opts.messages,
      stream: false,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq API error ${res.status}: ${t.slice(0, 800)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}
