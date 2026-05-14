/**
 * Verifies the Anthropic API request body shape produced by anthropic-api.ts.
 * We unit-test the internal splitMessages logic by importing the exported
 * functions and inspecting what they would send — without making real HTTP calls.
 *
 * What we're guarding against:
 *   1. System is sent as a content-block array (not a plain string) so that
 *      cache_control is valid per the Anthropic prompt-caching spec.
 *   2. A cache_control: {type:"ephemeral"} marker appears on the system block.
 *   3. Conversation midpoint gets a second cache breakpoint for long chats.
 *   4. Short conversations (< 6 turns) get no midpoint breakpoint.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We intercept fetch to capture the request body rather than calling Anthropic.
describe("anthropic prompt caching — request body shape", () => {
  let capturedBody: Record<string, unknown> | null = null;

  beforeEach(() => {
    capturedBody = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string) as Record<string, unknown>;
        // Return a minimal readable stream so streamClaudeChat doesn't throw
        const enc = new TextEncoder();
        const stream = new ReadableStream({
          start(ctrl) {
            ctrl.enqueue(enc.encode("data: {\"type\":\"message_stop\"}\n\n"));
            ctrl.close();
          },
        });
        return new Response(stream, { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends system as an array of content blocks (not a string)", async () => {
    const { streamClaudeChat } = await import("./anthropic-api");
    await streamClaudeChat({
      apiKey: "test-key",
      model: "claude-sonnet",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Hello" },
      ],
    });
    expect(Array.isArray(capturedBody?.system)).toBe(true);
  });

  it("system block has cache_control: {type:'ephemeral'}", async () => {
    const { streamClaudeChat } = await import("./anthropic-api");
    await streamClaudeChat({
      apiKey: "test-key",
      model: "claude-sonnet",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello" },
      ],
    });
    const systemBlocks = capturedBody?.system as Array<{ cache_control?: { type: string } }>;
    expect(systemBlocks[0]?.cache_control).toEqual({ type: "ephemeral" });
  });

  it("includes prompt-caching-2024-07-31 in the beta header", async () => {
    const { streamClaudeChat } = await import("./anthropic-api");
    await streamClaudeChat({
      apiKey: "test-key",
      model: "claude-haiku",
      messages: [{ role: "user", content: "Hi" }],
    });
    const fetchMock = vi.mocked(fetch);
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["anthropic-beta"]).toContain("prompt-caching-2024-07-31");
  });

  it("adds midpoint cache breakpoint for conversations >= 6 turns", async () => {
    const { streamClaudeChat } = await import("./anthropic-api");
    // 6 alternating turns = 3 user + 3 assistant
    const messages = [
      { role: "user", content: "Turn 1" },
      { role: "assistant", content: "Reply 1" },
      { role: "user", content: "Turn 2" },
      { role: "assistant", content: "Reply 2" },
      { role: "user", content: "Turn 3" },
      { role: "assistant", content: "Reply 3" },
      { role: "user", content: "Turn 4 — final question" },
    ];
    await streamClaudeChat({ apiKey: "test-key", model: "claude-sonnet", messages });
    const msgs = capturedBody?.messages as Array<{ content: unknown }>;
    const hasBlockWithCache = msgs.some((m) => {
      if (!Array.isArray(m.content)) return false;
      return (m.content as Array<{ cache_control?: unknown }>).some((b) => b.cache_control);
    });
    expect(hasBlockWithCache).toBe(true);
  });

  it("no midpoint cache breakpoint for short conversations (< 6 turns)", async () => {
    const { streamClaudeChat } = await import("./anthropic-api");
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Follow up" },
    ];
    await streamClaudeChat({ apiKey: "test-key", model: "claude-sonnet", messages });
    const msgs = capturedBody?.messages as Array<{ content: unknown }>;
    const hasBlockWithCache = msgs.some((m) => {
      if (!Array.isArray(m.content)) return false;
      return (m.content as Array<{ cache_control?: unknown }>).some((b) => b.cache_control);
    });
    expect(hasBlockWithCache).toBe(false);
  });
});
