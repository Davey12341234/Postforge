import { describe, expect, it } from "vitest";
import { babygptMessagesToGeminiContents } from "./gemini-contents";

describe("babygptMessagesToGeminiContents", () => {
  it("uses fileData for Gemini file refs", () => {
    const { contents } = babygptMessagesToGeminiContents(
      [
        {
          role: "user",
          content: "Describe this",
          attachments: [
            {
              id: "1",
              name: "big.pdf",
              mimeType: "application/pdf",
              sizeBytes: 9_000_000,
              geminiFileUri: "https://generativelanguage.googleapis.com/v1beta/files/abc",
              geminiFileName: "files/abc",
            },
          ],
        },
      ],
      "",
    );
    expect(contents).toHaveLength(1);
    const parts = contents[0]!.parts;
    expect(parts[0]).toEqual({ text: "Describe this" });
    expect(parts[1]).toEqual({
      fileData: {
        fileUri: "https://generativelanguage.googleapis.com/v1beta/files/abc",
        mimeType: "application/pdf",
      },
    });
  });

  it("uses inlineData when base64 is present", () => {
    const { contents } = babygptMessagesToGeminiContents(
      [
        {
          role: "user",
          content: "Hi",
          attachments: [
            {
              id: "2",
              name: "x.png",
              mimeType: "image/png",
              sizeBytes: 10,
              dataBase64: "qqqq",
            },
          ],
        },
      ],
      "",
    );
    expect(contents[0]!.parts[1]).toMatchObject({
      inlineData: { mimeType: "image/png", data: "qqqq" },
    });
  });
});
