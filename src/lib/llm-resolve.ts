import type ZAI from "z-ai-web-dev-sdk";
import { createZai } from "@/lib/zai";
import { getOpenAIApiKey } from "@/lib/openai-api";

export type LlmResolved =
  | { provider: "zai"; zai: InstanceType<typeof ZAI> }
  | { provider: "openai"; apiKey: string }
  | { provider: "none"; message: string };

/**
 * Prefer Z.AI (GLM) when configured; otherwise use OpenAI if `OPENAI_API_KEY` is set.
 * `z-ai-web-dev-sdk` targets Z.AI’s HTTP API — OpenAI is a separate compatibility path.
 */
export function resolveLlm(): LlmResolved {
  try {
    return { provider: "zai", zai: createZai() };
  } catch {
    const openai = getOpenAIApiKey();
    if (openai) {
      return { provider: "openai", apiKey: openai };
    }
    return {
      provider: "none",
      message:
        "No LLM configured. Set Z_AI_API_KEY (and optional Z_AI_BASE_URL) for GLM, or OPENAI_API_KEY for OpenAI. See .env.local.example.",
    };
  }
}
