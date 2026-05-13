import { describe, expect, it } from "vitest";
import { extractSseTextDelta, extractSseThinkingDelta } from "@/lib/stream-parse";

describe("stream-parse", () => {
  it("extractSseTextDelta reads OpenAI-style delta content", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { content: "hi" } }] })}\n`;
    expect(extractSseTextDelta(line)).toBe("hi");
  });

  it("extractSseThinkingDelta reads reasoning_content", () => {
    const line = `data: ${JSON.stringify({
      choices: [{ delta: { reasoning_content: "step 1" } }],
    })}\n`;
    expect(extractSseThinkingDelta(line)).toBe("step 1");
  });

  it("extractSseThinkingDelta reads thinking field", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { thinking: "t" } }] })}\n`;
    expect(extractSseThinkingDelta(line)).toBe("t");
  });

  it("skips schrodinger winner lines for text", () => {
    const line = `data: ${JSON.stringify({ schrodinger: true, winner: "glm-4-flash" })}\n`;
    expect(extractSseTextDelta(line)).toBe("");
  });
});
