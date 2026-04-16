import { describe, expect, it } from "vitest";
import { textForSpeech } from "./speech-synthesis";

describe("textForSpeech", () => {
  it("strips code fences and links", () => {
    expect(textForSpeech("Hello `code` and [link](https://x.com)")).toContain("Hello code and link");
  });

  it("removes heading markers", () => {
    expect(textForSpeech("# Title\n\nBody")).toContain("Title");
    expect(textForSpeech("# Title\n\nBody")).toContain("Body");
  });
});
