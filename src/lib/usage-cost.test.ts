import { describe, expect, it } from "vitest";
import { PLANS } from "./plans";
import type { ModelTier } from "./types";
import { planPermitsSend } from "./usage-cost";

const ALL_MODELS: ModelTier[] = ["glm-4-flash", "glm-4-air", "glm-4-plus", "glm-4-long", "glm-4"];

/** Automated stand-in for “open console + click every control” — validates PLANS ↔ planPermitsSend. */
describe("plan × capability matrix (audit)", () => {
  it("basic chat: allowedModels matches planPermitsSend for every plan × model", () => {
    for (const plan of Object.values(PLANS)) {
      for (const model of ALL_MODELS) {
        const allowed = plan.allowedModels.includes(model);
        expect(
          planPermitsSend(plan, { model, thinking: false, mode: "chat" }),
          `${plan.id} + ${model}`,
        ).toBe(allowed);
      }
    }
  });

  it("agent mode permitted iff plan.features.agent (using first allowed model)", () => {
    for (const plan of Object.values(PLANS)) {
      const model = plan.allowedModels[0]!;
      expect(
        planPermitsSend(plan, { model, thinking: false, mode: "agent" }),
        `${plan.id} agent`,
      ).toBe(plan.features.agent);
    }
  });

  it("schrodinger permitted iff plan.features.schrodinger with valid pair on-plan", () => {
    for (const plan of Object.values(PLANS)) {
      const a = plan.allowedModels[0]!;
      const b = plan.allowedModels.find((m) => m !== a) ?? a;
      const expected = plan.features.schrodinger && plan.allowedModels.includes(a) && plan.allowedModels.includes(b);
      expect(
        planPermitsSend(plan, {
          model: a,
          thinking: false,
          mode: "schrodinger",
          secondaryModel: b,
        }),
        `${plan.id} schrodinger`,
      ).toBe(expected);
    }
  });

  it("quantum flags require matching plan.features (starter: K+H not DNA)", () => {
    expect(
      planPermitsSend(PLANS.starter, {
        model: "glm-4-flash",
        thinking: false,
        mode: "chat",
        quantum: { kolmogorov: true, holographic: true, dna: false },
      }),
    ).toBe(true);
    expect(
      planPermitsSend(PLANS.starter, {
        model: "glm-4-flash",
        thinking: false,
        mode: "chat",
        quantum: { dna: true },
      }),
    ).toBe(false);
  });
});

describe("planPermitsSend", () => {
  it("allows free flash with thinking when quantum off", () => {
    expect(
      planPermitsSend(PLANS.free, {
        model: "glm-4-flash",
        thinking: true,
        mode: "chat",
      }),
    ).toBe(true);
  });

  it("rejects DNA quantum on free plan", () => {
    expect(
      planPermitsSend(PLANS.free, {
        model: "glm-4-flash",
        thinking: false,
        mode: "chat",
        quantum: { dna: true },
      }),
    ).toBe(false);
  });

  it("allows DNA on pro with glm-4", () => {
    expect(
      planPermitsSend(PLANS.pro, {
        model: "glm-4",
        thinking: false,
        mode: "chat",
        quantum: { kolmogorov: true, holographic: true, dna: true },
      }),
    ).toBe(true);
  });

  it("rejects schrodinger secondary model not on plan", () => {
    expect(
      planPermitsSend(PLANS.starter, {
        model: "glm-4-flash",
        thinking: false,
        mode: "schrodinger",
        secondaryModel: "glm-4-long",
      }),
    ).toBe(false);
  });

  it("allows schrodinger pair on pro when both models allowed", () => {
    expect(
      planPermitsSend(PLANS.pro, {
        model: "glm-4-flash",
        thinking: false,
        mode: "schrodinger",
        secondaryModel: "glm-4-air",
      }),
    ).toBe(true);
  });
});
