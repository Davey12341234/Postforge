"use client";

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { Skill } from "@/lib/skill-model";
import { createSkill, deleteSkill, loadAllSkills, saveCustomSkills } from "@/lib/skills";

export function SkillsPanel({
  open,
  onClose,
  onActivateSkill,
}: {
  open: boolean;
  onClose: () => void;
  /** Makes the skill the active system prompt modifier for the next sends. */
  onActivateSkill: (skill: Skill) => void;
}) {
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- refresh list when panel opens */
    setSkills(loadAllSkills());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("Custom");

  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, panelRef, onClose);

  function persist(next: Skill[]) {
    setSkills(next);
    const custom = next.filter((s) => !s.builtIn);
    saveCustomSkills(custom);
  }

  function onCreate() {
    const s = createSkill({
      name: name.trim() || "Untitled skill",
      description: description.trim() || "Custom skill",
      prompt: prompt.trim() || "Help the user.",
      category: category.trim() || "Custom",
    });
    persist([...skills, s]);
    setName("");
    setDescription("");
    setPrompt("");
  }

  function onDelete(id: string) {
    deleteSkill(id);
    setSkills(loadAllSkills());
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="h-[min(90vh,820px)] w-full max-w-4xl overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bbgpt-skills-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur">
          <div id="bbgpt-skills-title" className="text-sm font-semibold text-zinc-100">
            Skills
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[2fr,1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {skills.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-zinc-100">{s.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">{s.category}</div>
                  </div>
                  {!s.builtIn ? (
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => onDelete(s.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 text-xs text-zinc-400">{s.description}</div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg bg-zinc-900 py-1.5 text-[11px] font-semibold text-cyan-300 ring-1 ring-zinc-800 hover:bg-zinc-800"
                  onClick={() => {
                    onActivateSkill(s);
                    onClose();
                  }}
                >
                  Set active skill
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-semibold text-zinc-200">Create skill</div>
            <input
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              placeholder="Description (used for auto-suggest)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <textarea
              className="mt-2 w-full resize-none rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              rows={6}
              placeholder="Prompt instructions injected into system context"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              type="button"
              className="mt-2 w-full rounded-xl bg-zinc-100 py-2 text-xs font-semibold text-zinc-950"
              onClick={onCreate}
            >
              Save skill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
