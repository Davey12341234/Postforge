import { describe, it, expect } from "vitest";
import { trimContext, CONTEXT_CHAR_BUDGET, CONTEXT_MAX_TAIL } from "./context-trim";

const msg = (role: "user" | "assistant" | "system", content: string) => ({ role, content });
const big = (n: number) => "x".repeat(n);

describe("trimContext", () => {
  it("returns messages unchanged when under budget", () => {
    const msgs = [msg("user", "hello"), msg("assistant", "hi")];
    expect(trimContext(msgs)).toEqual(msgs);
  });

  it("always keeps system messages", () => {
    const sys = msg("system", "You are helpful.");
    const conv = Array.from({ length: 20 }, (_, i) => msg(i % 2 === 0 ? "user" : "assistant", big(4000)));
    const result = trimContext([sys, ...conv], 20_000);
    const systems = result.filter((m) => m.role === "system");
    expect(systems.some((m) => m.content === sys.content)).toBe(true);
  });

  it("always keeps the tail intact", () => {
    const conv = Array.from({ length: 30 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "assistant", big(3000)),
    );
    const result = trimContext(conv, 20_000, CONTEXT_MAX_TAIL);
    const nonSystem = result.filter((m) => m.role !== "system" || !m.content.startsWith("[Context"));
    // The last CONTEXT_MAX_TAIL non-system messages must be preserved verbatim
    const tail = conv.slice(-CONTEXT_MAX_TAIL);
    tail.forEach((t) => {
      expect(nonSystem.some((r) => r.content === t.content)).toBe(true);
    });
  });

  it("prepends a trim stub when messages were dropped", () => {
    const conv = Array.from({ length: 20 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "assistant", big(4000)),
    );
    const result = trimContext(conv, 20_000);
    const stub = result.find((m) => m.content.startsWith("[Context trimmed:"));
    expect(stub).toBeDefined();
  });

  it("does not prepend stub when nothing was dropped", () => {
    const msgs = [msg("user", "short"), msg("assistant", "reply")];
    const result = trimContext(msgs);
    expect(result.find((m) => m.content.startsWith("[Context trimmed:"))).toBeUndefined();
  });

  it("result fits within budget", () => {
    const conv = Array.from({ length: 40 }, () => msg("user", big(3000)));
    const result = trimContext(conv, CONTEXT_CHAR_BUDGET);
    const total = result.reduce((n, m) => n + m.content.length, 0);
    // Allow stub overhead
    expect(total).toBeLessThanOrEqual(CONTEXT_CHAR_BUDGET + 200);
  });
});
