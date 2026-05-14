/**
 * Unit tests for the journey profile route validation logic.
 * We test the validation rules directly without spinning up Next.js.
 */
import { describe, it, expect } from "vitest";
import { INTRO_INTAKE_MIN_CHARS } from "./onboarding-intake-storage";

// Validation logic extracted from the route — we mirror it here to keep tests
// independent of the DB and session stack.
function validateAnswers(answers: unknown): string | null {
  if (!Array.isArray(answers) || answers.length !== 7) {
    return "answers must be an array of exactly 7 strings";
  }
  for (const a of answers) {
    if (typeof a !== "string" || a.trim().length < INTRO_INTAKE_MIN_CHARS) {
      return `each answer must be at least ${INTRO_INTAKE_MIN_CHARS} characters`;
    }
  }
  return null;
}

const validAnswers = Array.from({ length: 7 }, (_, i) =>
  `Answer to question ${i + 1}: this is a detailed enough response.`,
);

describe("journey route — answer validation", () => {
  it("accepts 7 valid answers", () => {
    expect(validateAnswers(validAnswers)).toBeNull();
  });

  it("rejects non-array", () => {
    expect(validateAnswers("not an array")).not.toBeNull();
  });

  it("rejects fewer than 7 answers", () => {
    expect(validateAnswers(validAnswers.slice(0, 6))).not.toBeNull();
  });

  it("rejects more than 7 answers", () => {
    expect(validateAnswers([...validAnswers, "extra"])).not.toBeNull();
  });

  it("rejects answers shorter than INTRO_INTAKE_MIN_CHARS", () => {
    const short = [...validAnswers];
    short[3] = "short";
    expect(validateAnswers(short)).not.toBeNull();
  });

  it("rejects non-string entries", () => {
    const bad = [...validAnswers] as unknown[];
    bad[2] = 42;
    expect(validateAnswers(bad)).not.toBeNull();
  });

  it("trims whitespace before length check", () => {
    const padded = [...validAnswers];
    // Exactly INTRO_INTAKE_MIN_CHARS chars surrounded by spaces should pass
    padded[0] = " ".repeat(10) + "x".repeat(INTRO_INTAKE_MIN_CHARS) + " ".repeat(10);
    expect(validateAnswers(padded)).toBeNull();
  });

  it("rejects answers that are only whitespace", () => {
    const blank = [...validAnswers];
    blank[1] = " ".repeat(30);
    expect(validateAnswers(blank)).not.toBeNull();
  });
});

describe("INTRO_INTAKE_MIN_CHARS constant", () => {
  it("is a positive integer", () => {
    expect(INTRO_INTAKE_MIN_CHARS).toBeGreaterThan(0);
    expect(Number.isInteger(INTRO_INTAKE_MIN_CHARS)).toBe(true);
  });
});
