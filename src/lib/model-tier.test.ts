import { describe, expect, it } from "vitest";
import { isModelTier, parseModelTierBody } from "@/lib/model-tier";

describe("model-tier", () => {
  it("accepts known tiers", () => {
    expect(isModelTier("glm-4-flash")).toBe(true);
    expect(isModelTier("glm-4")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isModelTier("gpt-4")).toBe(false);
    expect(isModelTier("")).toBe(false);
    expect(isModelTier(1)).toBe(false);
  });

  it("parseModelTierBody reads model field", () => {
    expect(parseModelTierBody({ model: "glm-4-plus" })).toBe("glm-4-plus");
    expect(parseModelTierBody({ model: "nope" })).toBe(null);
    expect(parseModelTierBody({})).toBe(null);
  });
});
