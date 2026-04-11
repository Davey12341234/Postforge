"use client";

import { useEffect, useState } from "react";
import type { Prisma } from "@prisma/client";

export type DraftRow = Prisma.DraftGetPayload<Record<string, never>>;

function platformLabel(p: string | null | undefined): string {
  const u = (p ?? "").toUpperCase();
  if (u === "LINKEDIN" || u.includes("LINKED")) return "LinkedIn";
  if (u === "X" || u === "TWITTER") return "X";
  if (u === "INSTAGRAM") return "Instagram";
  return p || "—";
}

function platformBadgeClass(p: string | null | undefined): string {
  const u = (p ?? "").toUpperCase();
  if (u === "LINKEDIN" || u.includes("LINKED"))
    return "border-blue-500/40 bg-blue-600/15 text-blue-200";
  if (u === "X" || u === "TWITTER")
    return "border-zinc-500/50 bg-zinc-800 text-zinc-200";
  if (u === "INSTAGRAM")
    return "border-pink-500/40 bg-pink-600/15 text-pink-200";
  return "border-zinc-600 bg-zinc-800 text-zinc-300";
}

type Busy = "none" | "approve" | "reject" | "regenerate";

type Props = {
  draft: DraftRow | null;
  open: boolean;
  onClose: () => void;
  onCaptionSaved: (draftId: string, caption: string) => void;
  onApprove: (draftId: string) => Promise<void>;
  onReject: (draftId: string) => Promise<void>;
  onRegenerate: (draftId: string) => Promise<void>;
  busy: Busy;
};

export default function DraftReviewModal({
  draft,
  open,
  onClose,
  onCaptionSaved,
  onApprove,
  onReject,
  onRegenerate,
  busy,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync caption when switching drafts or when caption changes upstream (narrow deps).
  useEffect(() => {
    if (!draft) return;
    setCaption(draft.caption);
    setIsEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, draft?.caption]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !draft) return null;

  const pillar = draft.pillar?.trim() || "General";

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/update-draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, caption }),
      });
      if (!res.ok) {
        console.error("Save failed");
        return;
      }
      onCaptionSaved(draft.id, caption);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className="modal-enter relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-emerald-500/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-900/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <h2
              id="draft-modal-title"
              className="text-lg font-semibold text-white"
            >
              Review draft
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${platformBadgeClass(draft.platform)}`}
              >
                {platformLabel(draft.platform)}
              </span>
              <span className="inline-flex rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-200/90">
                {pillar}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isEditing ? (
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[200px] w-full resize-y rounded-xl border border-zinc-600 bg-zinc-800/80 p-4 text-sm leading-relaxed text-zinc-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
              {caption}
            </p>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-zinc-800 bg-zinc-900/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="order-last h-11 rounded-xl border border-zinc-600 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 sm:order-none"
            >
              Cancel
            </button>
            {isEditing ? (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Edit post
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => void onReject(draft.id)}
              disabled={busy !== "none"}
              className="h-11 rounded-xl border border-red-500/40 bg-red-950/40 px-4 text-sm font-medium text-red-200 transition-colors hover:bg-red-950/60 disabled:opacity-50"
            >
              {busy === "reject" ? "Rejecting…" : "Reject"}
            </button>
            <button
              type="button"
              onClick={() => void onRegenerate(draft.id)}
              disabled={busy !== "none"}
              className="h-11 rounded-xl border border-orange-500/40 bg-orange-950/30 px-4 text-sm font-medium text-orange-200 transition-colors hover:bg-orange-950/50 disabled:opacity-50"
            >
              {busy === "regenerate" ? "Regenerating…" : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={() => void onApprove(draft.id)}
              disabled={busy !== "none"}
              className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy === "approve" ? "Scheduling…" : "Approve & schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
