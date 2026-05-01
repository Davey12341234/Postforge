import { describe, expect, it } from "vitest";

import { normalizeEmail } from "@/lib/email-normalize";
import { parseMagicLinkEmailAllowlist } from "@/lib/magic-link-allowlist-parse";

describe("normalizeEmail", () => {
  it("lower-trims", () => {
    expect(normalizeEmail("  A@B.COM  ")).toBe("a@b.com");
    expect(normalizeEmail("")).toBeUndefined();
  });
});

describe("parseMagicLinkEmailAllowlist", () => {
  it("parses comma list", () => {
    const s = parseMagicLinkEmailAllowlist("a@x.com, b@y.org ");
    expect(s.has("a@x.com")).toBe(true);
    expect(s.has("b@y.org")).toBe(true);
  });
});
