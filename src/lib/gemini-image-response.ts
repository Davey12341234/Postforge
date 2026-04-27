import type { GenerateContentResponse } from "@google/genai";

/** Normalize inline image bytes from @google/genai (string base64 or binary). */
export function geminiInlineDataToBase64(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") {
    const t = data.trim();
    return t.length ? t : null;
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data).toString("base64");
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
    return data.toString("base64");
  }
  return null;
}

/** Read inline image blob from a Part (camelCase or snake_case wire shapes). */
export function readGeminiPartInline(part: unknown): { data: unknown; mimeType?: string } | null {
  if (!part || typeof part !== "object") return null;
  const o = part as Record<string, unknown>;
  const inline = (o.inlineData ?? o.inline_data) as Record<string, unknown> | undefined;
  if (!inline || typeof inline !== "object") return null;
  const mimeRaw = inline.mimeType ?? inline.mime_type;
  const mimeType = typeof mimeRaw === "string" && mimeRaw.trim() ? mimeRaw.trim() : undefined;
  return { data: inline.data, mimeType };
}

function peekFirstInlineMime(response: GenerateContentResponse): string | null {
  for (const cand of response.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      const inline = readGeminiPartInline(part);
      if (inline?.mimeType) return inline.mimeType;
    }
  }
  return null;
}

/** Walk candidates/parts for the first image inline payload. */
export function extractGeminiImageFromResponse(response: GenerateContentResponse): {
  base64: string;
  mimeType: string;
} | null {
  for (const cand of response.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      const inline = readGeminiPartInline(part);
      if (!inline?.data) continue;
      const base64 = geminiInlineDataToBase64(inline.data);
      if (!base64) continue;
      return {
        base64,
        mimeType: inline.mimeType ?? "image/png",
      };
    }
  }
  return null;
}

/**
 * Prefer structured parts; fall back to {@link GenerateContentResponse}'s `data` getter
 * (concatenated inline payloads) when parts are empty but image bytes exist.
 */
export function extractGeminiImageBestEffort(response: GenerateContentResponse): {
  base64: string;
  mimeType: string;
} | null {
  const fromParts = extractGeminiImageFromResponse(response);
  if (fromParts) return fromParts;

  try {
    const r = response as GenerateContentResponse & { data?: string };
    const raw = typeof r.data === "string" ? r.data.trim() : "";
    if (raw.length > 0) {
      return {
        base64: raw,
        mimeType: peekFirstInlineMime(response) ?? "image/png",
      };
    }
  } catch {
    // `.data` getter can throw when non-inline modalities dominate; ignore.
  }
  return null;
}

/** User-actionable explanation when no image bytes are present. */
export function describeGeminiImageFailure(response: GenerateContentResponse): string | null {
  const fb = response.promptFeedback;
  if (fb?.blockReason) {
    const extra =
      typeof fb.blockReasonMessage === "string" && fb.blockReasonMessage.trim()
        ? `: ${fb.blockReasonMessage.trim()}`
        : "";
    return `Prompt blocked (${String(fb.blockReason)})${extra}`;
  }

  const c0 = response.candidates?.[0];
  if (response.candidates?.length === 0 || c0 == null) {
    return "No response candidates returned — try a different prompt.";
  }

  if (
    c0.finishReason &&
    c0.finishReason !== "STOP" &&
    c0.finishReason !== "FINISH_REASON_UNSPECIFIED"
  ) {
    return `Image generation stopped (${String(c0.finishReason)}). Try a different prompt.`;
  }

  return null;
}

export function tryGeminiResponseText(response: GenerateContentResponse): string {
  try {
    const t = response.text?.trim();
    return t ?? "";
  } catch {
    return "";
  }
}
