import { describe, expect, it } from "vitest";
import { fetchChatWithRetry, formatChatError } from "@/lib/fetch-chat";

describe("fetchChatWithRetry", () => {
  it("throws AbortError before fetch when signal is already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(fetchChatWithRetry("https://example.test/chat", { signal: ac.signal })).rejects.toThrow(
      DOMException,
    );
  });
});

describe("formatChatError", () => {
  it("maps 503 missing LLM copy", () => {
    const s = formatChatError(503, "No LLM configured. Set keys.");
    expect(s).toContain("LLM not configured");
  });

  it("passes through generic 502 message", () => {
    expect(formatChatError(502, "upstream")).toBe("upstream");
  });
});
