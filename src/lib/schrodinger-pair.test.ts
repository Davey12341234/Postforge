import { describe, expect, it } from "vitest";
import { schrodingerPair } from "@/lib/schrodinger-pair";

describe("schrodingerPair", () => {
  it("uses default counterpart when allowed", () => {
    const p = schrodingerPair("glm-4-flash", ["glm-4-flash", "glm-4-air", "glm-4-plus"]);
    expect(p).toEqual({ modelA: "glm-4-flash", modelB: "glm-4-air" });
  });

  it("falls back to another allowed tier when counterpart missing", () => {
    const p = schrodingerPair("glm-4-flash", ["glm-4-flash", "glm-4-plus"]);
    expect(p.modelA).toBe("glm-4-flash");
    expect(p.modelB).toBe("glm-4-plus");
  });

  it("picks any other allowed tier when counterpart missing", () => {
    const p = schrodingerPair("glm-4-long", ["glm-4-flash", "glm-4-air"]);
    expect(p.modelA).toBe("glm-4-long");
    expect(p.modelB).toBe("glm-4-flash");
  });
});
