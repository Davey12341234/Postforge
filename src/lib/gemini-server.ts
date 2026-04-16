import { GoogleGenAI } from "@google/genai";

export function getGeminiApiKey(): string | null {
  const k = process.env.GEMINI_API_KEY?.trim();
  return k || null;
}

export function createGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export function getGeminiChatModel(): string {
  return process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-2.5-flash";
}

/** Native image generation (see https://ai.google.dev/gemini-api/docs/image-generation). */
export function getGeminiImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
}
