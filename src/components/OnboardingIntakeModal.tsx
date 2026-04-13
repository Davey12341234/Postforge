"use client";

import { useCallback, useMemo, useState } from "react";
import { INTRO_SEVEN_QUESTIONS } from "@/lib/companion-onboarding";
import { INTRO_INTAKE_MIN_CHARS } from "@/lib/onboarding-intake-storage";

const WHY_CONNECTION_COPY = {
  title: "Why connection matters",
  lead:
    "BabyGPT is not a clinician. What we can do is use your words—goals, constraints, tone—to steer replies toward what actually fits you. That is the same reason coaches take an intake and why good product copy asks who it is for: ambiguity is expensive.",
  bullets: [
    {
      label: "Coaching & counseling research",
      text:
        "Across decades of outcome studies, the quality of the relationship (often called “working alliance”) shows up as one of the strongest predictors of benefit—often as large as or larger than the specific method used. Intake isn’t fluff; it’s how alignment starts.",
    },
    {
      label: "Human–computer interaction",
      text:
        "Systems that adapt to stated goals, vocabulary, and constraints are rated more useful and less frustrating. People consistently report “relevance” and “feels like it gets me” when context is explicit.",
    },
    {
      label: "Large language models",
      text:
        "Models have no persistent memory of you unless we give it. A structured summary of your situation, urgency, stakeholders, and preferred tone reduces guesswork and helps answers stay on-narrative instead of generic.",
    },
  ],
  footer:
    "Nothing here replaces professional care if you need it. This questionnaire simply gives the model a fair shot at meeting you where you are.",
} as const;

export function OnboardingIntakeModal({
  appearance,
  onComplete,
}: {
  appearance: "light" | "dark" | "oled";
  onComplete: (answers: string[]) => void;
}) {
  const theme = appearance === "light" ? "light" : "dark";
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => INTRO_SEVEN_QUESTIONS.map(() => ""));
  const [touched, setTouched] = useState(false);

  const question = INTRO_SEVEN_QUESTIONS[step]!;
  const value = answers[step] ?? "";
  const validLength = value.trim().length >= INTRO_INTAKE_MIN_CHARS;
  const isLast = step === INTRO_SEVEN_QUESTIONS.length - 1;

  const panelClass =
    theme === "light"
      ? "border-zinc-200 bg-white text-zinc-900 ring-zinc-300/80"
      : "border-zinc-800 bg-zinc-950 text-zinc-100 ring-zinc-800/80";

  const muted = theme === "light" ? "text-zinc-600" : "text-zinc-400";
  const inputClass =
    theme === "light"
      ? "border-zinc-300 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:ring-cyan-600/40"
      : "border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600 focus:ring-cyan-500/35";

  const setCurrent = useCallback(
    (next: string) => {
      setAnswers((prev) => {
        const copy = [...prev];
        copy[step] = next;
        return copy;
      });
    },
    [step],
  );

  const goNext = useCallback(() => {
    setTouched(true);
    if (!validLength) return;
    if (isLast) {
      onComplete(answers.map((a, i) => (i === step ? value : a)));
      return;
    }
    setStep((s) => s + 1);
    setTouched(false);
  }, [answers, isLast, onComplete, step, validLength, value]);

  const goBack = useCallback(() => {
    setTouched(false);
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const progress = useMemo(
    () => `${step + 1} / ${INTRO_SEVEN_QUESTIONS.length}`,
    [step],
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/70 px-3 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-intake-title"
    >
      <div
        className={`flex w-full max-w-lg flex-col rounded-2xl border p-5 shadow-2xl ring-1 ${panelClass}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
              Before your first message · {progress}
            </p>
            <h2 id="intro-intake-title" className="mt-1 text-lg font-semibold tracking-tight">
              Connection questionnaire
            </h2>
            <p className={`mt-2 text-xs leading-relaxed ${muted}`}>
              Answer each question in your own words. This runs once, stays on your device, and is
              folded into local memory so replies can match your situation and tone.
            </p>
          </div>
        </div>

        <details className={`mt-4 rounded-xl border px-3 py-2 text-xs ${theme === "light" ? "border-cyan-200 bg-cyan-50/80" : "border-cyan-900/50 bg-cyan-950/25"}`}>
          <summary className="cursor-pointer font-medium text-cyan-200/95 [&::-webkit-details-marker]:hidden">
            {WHY_CONNECTION_COPY.title}
          </summary>
          <p className={`mt-2 leading-relaxed ${muted}`}>{WHY_CONNECTION_COPY.lead}</p>
          <ul className="mt-3 space-y-3">
            {WHY_CONNECTION_COPY.bullets.map((b) => (
              <li key={b.label}>
                <span className="font-medium text-cyan-100/90">{b.label}. </span>
                <span className={muted}>{b.text}</span>
              </li>
            ))}
          </ul>
          <p className={`mt-3 text-[11px] leading-relaxed ${muted}`}>{WHY_CONNECTION_COPY.footer}</p>
        </details>

        <label className={`mt-5 block text-sm font-medium ${theme === "light" ? "text-zinc-800" : "text-zinc-200"}`}>
          {question}
        </label>
        <textarea
          value={value}
          onChange={(e) => setCurrent(e.target.value)}
          rows={5}
          className={`mt-2 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none ring-0 transition focus:ring-2 ${inputClass}`}
          placeholder="Type a concrete answer (a few sentences is enough)."
          autoComplete="off"
          autoFocus
        />
        {touched && !validLength ? (
          <p className="mt-1 text-[11px] text-amber-400/95">
            Please add a bit more detail (at least {INTRO_INTAKE_MIN_CHARS} characters) so the model
            isn’t guessing.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className={`rounded-full px-4 py-2 text-xs font-medium ring-1 disabled:opacity-40 ${
              theme === "light"
                ? "bg-zinc-100 text-zinc-800 ring-zinc-300 hover:bg-zinc-200"
                : "bg-zinc-900 text-zinc-200 ring-zinc-700 hover:bg-zinc-800"
            }`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-cyan-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-900/30 hover:bg-cyan-500"
          >
            {isLast ? "Finish & start chatting" : "Next question"}
          </button>
        </div>
      </div>
    </div>
  );
}
