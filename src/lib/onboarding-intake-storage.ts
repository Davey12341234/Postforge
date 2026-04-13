import { lsKey } from "./storage";

const KEY = lsKey("intro_questionnaire_v1");

/** Minimum characters per answer (modal and persisted record must agree). */
export const INTRO_INTAKE_MIN_CHARS = 12;

export type IntroIntakeRecord = {
  /** Parallel to `INTRO_SEVEN_QUESTIONS` */
  answers: string[];
  completedAt: number;
};

export function isIntroIntakeComplete(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as IntroIntakeRecord;
    return (
      Array.isArray(parsed.answers) &&
      parsed.answers.length === 7 &&
      parsed.answers.every((a) => typeof a === "string" && a.trim().length >= INTRO_INTAKE_MIN_CHARS) &&
      typeof parsed.completedAt === "number"
    );
  } catch {
    return false;
  }
}

export function loadIntroIntake(): IntroIntakeRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntroIntakeRecord;
    if (!isIntroIntakeComplete()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIntroIntake(answers: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const rec: IntroIntakeRecord = {
      answers: answers.map((a) => a.trim()),
      completedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    // ignore
  }
}
