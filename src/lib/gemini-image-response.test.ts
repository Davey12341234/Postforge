import type { GenerateContentResponse } from "@google/genai";
import { describe, expect, it } from "vitest";
import {
  extractGeminiImageBestEffort,
  extractGeminiImageFromResponse,
  geminiInlineDataToBase64,
  tryGeminiResponseText,
} from "./gemini-image-response";

describe("gemini-image-response", () => {
  it("geminiInlineDataToBase64 handles string and Uint8Array", () => {
    expect(geminiInlineDataToBase64("abcd")).toBe("abcd");
    expect(geminiInlineDataToBase64(new Uint8Array([1, 2, 3]))).toBe(Buffer.from([1, 2, 3]).toString("base64"));
  });

  it("extractGeminiImageFromResponse finds first inline image", () => {
    const b64 = Buffer.from([0, 1, 2]).toString("base64");
    const response = {
      candidates: [
        {
          content: {
            parts: [{ text: "x" }, { inlineData: { data: b64, mimeType: "image/png" } }],
          },
        },
      ],
      text: () => {
        throw new Error("no text");
      },
    } as unknown as Parameters<typeof extractGeminiImageFromResponse>[0];
    const out = extractGeminiImageFromResponse(response);
    expect(out?.mimeType).toBe("image/png");
    expect(out?.base64).toBe(b64);
  });

  it("extractGeminiImageFromResponse reads snake_case inline_data", () => {
    const b64 = Buffer.from([9]).toString("base64");
    const response = {
      candidates: [
        {
          content: {
            parts: [{ inline_data: { data: b64, mime_type: "image/jpeg" } }],
          },
        },
      ],
    } as unknown as Parameters<typeof extractGeminiImageFromResponse>[0];
    const out = extractGeminiImageFromResponse(response);
    expect(out?.mimeType).toBe("image/jpeg");
    expect(out?.base64).toBe(b64);
  });

  it("extractGeminiImageBestEffort falls back to SDK data getter", () => {
    const payload = Buffer.from([1, 2, 3]).toString("base64");
    const response = {
      candidates: [],
      get data() {
        return payload;
      },
    } as unknown as GenerateContentResponse;
    const out = extractGeminiImageBestEffort(response);
    expect(out?.mimeType).toBe("image/png");
    expect(out?.base64).toBe(payload);
  });

  it("tryGeminiResponseText returns trimmed text when present", () => {
    expect(tryGeminiResponseText({ text: "  note  " } as Parameters<typeof tryGeminiResponseText>[0])).toBe("note");
  });
});
