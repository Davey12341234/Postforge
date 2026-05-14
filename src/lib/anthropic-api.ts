/**
 * Anthropic Claude API integration for bbGPT.
 * Uses the raw HTTP API (no SDK required) so the bundle stays clean.
 * Converts Anthropic SSE → OpenAI-compatible SSE so the existing client parser
 * (stream-parse.ts) works with zero changes on the frontend.
 *
 * Prompt caching is enabled on every request:
 *   - System prompt is marked cache_control: {type:"ephemeral"} → ~90% cost
 *     reduction on repeated system tokens (5-minute TTL per Anthropic docs).
 *   - For conversations ≥ 6 turns, the message midpoint is also cached so
 *     the shared prefix of long chats isn't re-billed.
 *
 * Supported models:
 *   claude-haiku   → claude-haiku-4-5-20251001   (fast, 1 cr)
 *   claude-sonnet  → claude-sonnet-4-6            (balanced, 5 cr)
 *   claude-opus    → claude-opus-4-6              (flagship, 10 cr)
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Minimum tokens a block must contain before the cache_control hint is useful.
// Anthropic ignores cache_control on blocks < 1 024 tokens (Haiku/Sonnet/Opus 4.x).
// 800 chars ≈ 200 tokens — we apply it unconditionally; Anthropic silently ignores
// the hint on small blocks rather than erroring.
const CACHE_BETA = "prompt-caching-2024-07-31";
const THINKING_BETA = "interleaved-thinking-2025-05-14";

/** Map bbGPT tier names → actual Anthropic model IDs */
export const CLAUDE_MODEL_MAP: Record<string, string> = {
  "claude-haiku":  "claude-haiku-4-5-20251001",
  "claude-sonnet": "claude-sonnet-4-6",
  "claude-opus":   "claude-opus-4-6",
};

export function getAnthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

export function isClaudeTier(model: string): boolean {
  return model.startsWith("claude-");
}

type TextBlock = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };
type ContentBlock = TextBlock;

/**
 * Convert bbGPT/OpenAI-style messages to Anthropic format.
 * Anthropic requires system as a top-level param; user/assistant alternate.
 * Returns content as arrays of blocks so cache_control can be applied.
 */
function splitMessages(
  messages: { role: string; content: string }[],
  enableCaching = true,
): {
  system: ContentBlock[];
  messages: { role: "user" | "assistant"; content: string | ContentBlock[] }[];
} {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  // System as a content-block array so cache_control is valid
  const systemBlocks: ContentBlock[] = systemText
    ? [{ type: "text", text: systemText, ...(enableCaching ? { cache_control: { type: "ephemeral" } } : {}) }]
    : [];

  // Anthropic requires alternating user/assistant, starting with user.
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "assistant" : "user";
    const last = turns[turns.length - 1];
    if (last && last.role === role) {
      last.content += "\n\n" + m.content;
    } else {
      turns.push({ role, content: m.content });
    }
  }

  // Must start with user turn
  if (turns.length && turns[0].role === "assistant") {
    turns.unshift({ role: "user", content: "(continuing)" });
  }

  // Must end with user turn
  if (turns.length && turns[turns.length - 1].role === "assistant") {
    turns.push({ role: "user", content: "Please continue." });
  }

  if (!turns.length) {
    return { system: systemBlocks, messages: [{ role: "user", content: "Hello" }] };
  }

  // Apply a second cache breakpoint at the conversation midpoint when the
  // dialog is long enough that the shared prefix is worth caching.
  // Anthropic allows up to 4 breakpoints per request; we use 2 (system + mid).
  const formatted: { role: "user" | "assistant"; content: string | ContentBlock[] }[] = turns.map(
    (t, i) => {
      const isLastUser = t.role === "user" && i === turns.length - 1;
      // Cache midpoint: mark the user turn roughly halfway through a long conversation.
      const isMidpoint =
        enableCaching &&
        turns.length >= 6 &&
        i === Math.floor(turns.length / 2) &&
        !isLastUser;

      if (isMidpoint) {
        return {
          role: t.role,
          content: [{ type: "text" as const, text: t.content, cache_control: { type: "ephemeral" as const } }],
        };
      }
      return { role: t.role, content: t.content };
    },
  );

  return { system: systemBlocks, messages: formatted };
}

/**
 * Stream a Claude completion and return a ReadableStream<Uint8Array> that
 * emits OpenAI-compatible SSE lines. The existing extractSseTextDelta and
 * extractSseThinkingDelta parsers on the client will work unchanged.
 *
 * Anthropic SSE events we handle:
 *   content_block_delta (text_delta)  → choices[0].delta.content
 *   content_block_delta (thinking)    → choices[0].delta.reasoning_content
 *   message_stop                      → [DONE]
 */
export async function streamClaudeChat(opts: {
  apiKey: string;
  model: string; // bbGPT tier like "claude-sonnet"
  messages: { role: string; content: string }[];
  thinking?: boolean;
}): Promise<ReadableStream<Uint8Array>> {
  const claudeModel = CLAUDE_MODEL_MAP[opts.model] ?? CLAUDE_MODEL_MAP["claude-sonnet"];
  const { system, messages } = splitMessages(opts.messages, true);

  const thinkingParam =
    opts.thinking && opts.model !== "claude-haiku"
      ? { thinking: { type: "enabled", budget_tokens: 8000 } }
      : {};

  const betaHeaders = [CACHE_BETA, ...(opts.thinking ? [THINKING_BETA] : [])].join(",");

  const body: Record<string, unknown> = {
    model: claudeModel,
    max_tokens: opts.thinking ? 16000 : 8192,
    stream: true,
    messages,
    ...thinkingParam,
  };
  if (system.length) body.system = system;

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": opts.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
      "anthropic-beta": betaHeaders,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error("Anthropic API error " + res.status + ": " + t.slice(0, 800));
  }

  if (!res.body) throw new Error("Anthropic returned empty body");

  const enc = new TextEncoder();
  const src = res.body;

  // Transform Anthropic SSE → OpenAI-compatible SSE
  const transform = new TransformStream({
    async transform(chunk, ctrl) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (!payload) continue;

        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const type = parsed.type;

        if (type === "content_block_delta") {
          const delta = parsed.delta;
          if (!delta) continue;

          const deltaType = delta.type;

          if (deltaType === "text_delta") {
            const text = delta.text ?? "";
            const sse = "data: " + JSON.stringify({ choices: [{ delta: { content: text } }] }) + "\n\n";
            ctrl.enqueue(enc.encode(sse));
          } else if (deltaType === "thinking_delta") {
            const thinking = delta.thinking ?? "";
            const sse = "data: " + JSON.stringify({ choices: [{ delta: { reasoning_content: thinking } }] }) + "\n\n";
            ctrl.enqueue(enc.encode(sse));
          }
        } else if (type === "message_stop") {
          ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
        } else if (type === "error") {
          const msg = parsed.error?.message ?? "Unknown Anthropic error";
          throw new Error(msg);
        }
      }
    },
  });

  return src.pipeThrough(transform);
}

/**
 * Non-streaming Claude completion — used in agent loop planner steps.
 * Caching is applied to the system prompt to cut repeated planner overhead.
 */
export async function claudeChatCompletionJson(opts: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<string> {
  const claudeModel = CLAUDE_MODEL_MAP[opts.model] ?? CLAUDE_MODEL_MAP["claude-sonnet"];
  const { system, messages } = splitMessages(opts.messages, true);

  const body: Record<string, unknown> = {
    model: claudeModel,
    max_tokens: 4096,
    stream: false,
    messages,
  };
  if (system.length) body.system = system;

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": opts.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
      "anthropic-beta": CACHE_BETA,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error("Anthropic API error " + res.status + ": " + t.slice(0, 800));
  }

  const data = await res.json() as {
    content?: { type: string; text?: string }[];
  };

  return data.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("") ?? "";
}
