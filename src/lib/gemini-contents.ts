import type { ChatAttachment } from "@/lib/types";

export type PayloadMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { fileUri: string; mimeType: string } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

/** Map BabyGPT history to Gemini `contents` (multimodal user parts). */
export function babygptMessagesToGeminiContents(
  messages: PayloadMessage[],
  memoryPrompt?: string,
): { contents: GeminiContent[]; systemInstruction?: string } {
  const systemInstruction = [memoryPrompt].filter(Boolean).join("\n\n").trim() || undefined;
  const contents: GeminiContent[] = [];

  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "assistant") {
      contents.push({
        role: "model",
        parts: [{ text: m.content }],
      });
      continue;
    }
    const parts: GeminiPart[] = [];
    if (m.content.trim()) {
      parts.push({ text: m.content });
    }
    for (const a of m.attachments ?? []) {
      if (a.geminiFileUri) {
        parts.push({
          fileData: {
            fileUri: a.geminiFileUri,
            mimeType: a.mimeType || "application/octet-stream",
          },
        });
      } else if (a.dataBase64) {
        parts.push({
          inlineData: {
            mimeType: a.mimeType || "application/octet-stream",
            data: a.dataBase64,
          },
        });
      }
    }
    if (parts.length === 0) {
      parts.push({ text: "(empty message)" });
    }
    contents.push({ role: "user", parts });
  }

  return { contents, systemInstruction };
}
