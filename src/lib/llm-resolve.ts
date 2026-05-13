import type ZAI from "z-ai-web-dev-sdk";
import { createZai } from "@/lib/zai";
import { getOpenAIApiKey } from "@/lib/openai-api";
import { getAnthropicApiKey, isClaudeTier } from "@/lib/anthropic-api";
import { getOpenRouterApiKey } from "@/lib/openrouter-api";
import { getGroqApiKey } from "@/lib/groq-api";
import type { ModelTier } from "@/lib/types";

export type LlmResolved =
  | { provider: "zai"; zai: InstanceType<typeof ZAI> }
  | { provider: "openai"; apiKey: string }
  | { provider: "anthropic"; apiKey: string }
  | { provider: "openrouter"; apiKey: string }
  | { provider: "groq"; apiKey: string }
  | { provider: "none"; message: string };

/**
 * Resolve the LLM provider for a given model tier.
 *
 * Routing priority for Claude tiers:
 *  1. ANTHROPIC_API_KEY  -> direct Anthropic API
 *  2. OPENROUTER_API_KEY -> OpenRouter (same Claude models, OpenAI-compat)
 *  3. GROQ_API_KEY       -> Groq free tier (Llama 3.3 70B — zero cost, no card)
 *  4. Nothing set        -> 503
 *
 * Routing priority for GLM tiers:
 *  1. Z_AI_API_KEY       -> Z.AI / GLM (primary)
 *  2. OPENAI_API_KEY     -> OpenAI fallback
 *  3. ANTHROPIC_API_KEY  -> Claude Sonnet universal fallback
 *  4. OPENROUTER_API_KEY -> OpenRouter fallback
 *  5. GROQ_API_KEY       -> Groq fallback
 *  6. Nothing            -> 503
 */
export function resolveLlm(model?: ModelTier): LlmResolved {
  // -- Claude tiers ---------------------------------------------------------
  if (model && isClaudeTier(model)) {
    const anthropicKey = getAnthropicApiKey();
    if (anthropicKey) return { provider: "anthropic", apiKey: anthropicKey };

    const routerKey = getOpenRouterApiKey();
    if (routerKey) return { provider: "openrouter", apiKey: routerKey };

    const groqKey = getGroqApiKey();
    if (groqKey) return { provider: "groq", apiKey: groqKey };

    return {
      provider: "none",
      message:
        "Claude model selected but no API key is configured. " +
        "Add ANTHROPIC_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY to your environment.",
    };
  }

  // -- GLM / Z.AI path ------------------------------------------------------
  try {
    return { provider: "zai", zai: createZai() };
  } catch {
    const openai = getOpenAIApiKey();
    if (openai) return { provider: "openai", apiKey: openai };

    // Last resort: Claude via Anthropic or OpenRouter as universal fallback
    const anthropic = getAnthropicApiKey();
    if (anthropic) return { provider: "anthropic", apiKey: anthropic };

    const router = getOpenRouterApiKey();
    if (router) return { provider: "openrouter", apiKey: router };

    const groq = getGroqApiKey();
    if (groq) return { provider: "groq", apiKey: groq };

    return {
      provider: "none",
      message:
        "No LLM configured. Set Z_AI_API_KEY for GLM, OPENAI_API_KEY for OpenAI, " +
        "ANTHROPIC_API_KEY for Claude, OPENROUTER_API_KEY for OpenRouter, " +
        "or GROQ_API_KEY for Groq (free).",
    };
  }
}
