import OpenAI from "openai";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";

export function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: key });
}

/**
 * Flatten assistant text from a Responses API result.
 */
export function extractResponsesOutputText(resp: OpenAIResponse): string {
  const parts: string[] = [];
  for (const item of resp.output ?? []) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === "output_text" && "text" in c) {
          parts.push(c.text);
        }
        if (c.type === "refusal" && "refusal" in c) {
          parts.push((c as { refusal: string }).refusal);
        }
      }
    }
  }
  return parts.join("\n").trim();
}
