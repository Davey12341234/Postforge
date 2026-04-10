import { describe, expect, it } from "vitest";
import { dalle3CreditCost } from "@/lib/image-gen/costs";

describe("dalle3CreditCost", () => {
  it("charges 15 credits for standard quality", () => {
    expect(dalle3CreditCost("1024x1024", "standard")).toBe(15);
    expect(dalle3CreditCost("1792x1024", "standard")).toBe(15);
  });

  it("charges 30 credits for hd quality", () => {
    expect(dalle3CreditCost("1024x1024", "hd")).toBe(30);
  });
});
