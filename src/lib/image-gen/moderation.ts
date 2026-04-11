import OpenAI from "openai";

export type ModerationResult = { ok: true } | { ok: false; reason: string };

/**
 * OpenAI Moderation API (cheap classification). Call before image generation.
 */
export async function moderateImagePrompt(text: string): Promise<ModerationResult> {
  return moderateOpenAIText(text, "Prompt blocked by moderation policy.");
}

/**
 * Moderation for user-authored chat or captions (same API as image prompts).
 */
export async function moderateOpenAIText(
  text: string,
  blockedReason = "Content blocked by moderation policy.",
): Promise<ModerationResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { ok: false, reason: "OPENAI_API_KEY is not configured" };
  }
  const openai = new OpenAI({ apiKey: key });
  const res = await openai.moderations.create({ input: text });
  const flagged = res.results[0]?.flagged === true;
  if (flagged) {
    return { ok: false, reason: blockedReason };
  }
  return { ok: true };
}
