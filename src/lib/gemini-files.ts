import type { GoogleGenAI } from "@google/genai";

/** Poll until uploaded media is ready for `generateContent` (videos need this; images are usually fast). */
export async function waitForGeminiFileActive(
  ai: GoogleGenAI,
  resourceName: string,
  opts?: { timeoutMs?: number; pollMs?: number },
): Promise<{ uri: string; mimeType?: string; sizeBytes?: number }> {
  const timeoutMs = opts?.timeoutMs ?? 180_000;
  const pollMs = opts?.pollMs ?? 1000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const f = await ai.files.get({ name: resourceName });
    const state = String(f.state ?? "");
    if (state === "ACTIVE") {
      if (!f.uri) throw new Error("Gemini file is ACTIVE but has no URI.");
      return {
        uri: f.uri,
        mimeType: f.mimeType ?? undefined,
        sizeBytes: f.sizeBytes ? Number(f.sizeBytes) : undefined,
      };
    }
    if (state === "FAILED") {
      throw new Error("Gemini could not process this file.");
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error("Timed out waiting for Gemini to finish processing the upload.");
}
