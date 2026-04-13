import { lsKey } from "./storage";

const KEY = lsKey("reminders_v1");

export type Reminder = {
  id: string;
  text: string;
  triggerAt: number;
  createdAt: number;
};

function loadAll(): Reminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Reminder[];
  } catch {
    return [];
  }
}

function saveAll(items: Reminder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listReminders(): Reminder[] {
  return loadAll().sort((a, b) => a.triggerAt - b.triggerAt);
}

export function addReminder(r: Reminder) {
  const all = loadAll();
  all.push(r);
  saveAll(all);
}

export function removeReminder(id: string) {
  saveAll(loadAll().filter((x) => x.id !== id));
}

export function dueReminders(now = Date.now()): Reminder[] {
  return loadAll().filter((r) => r.triggerAt <= now);
}

/** Parse "remind me ... in 30 minutes" style lines from a user message */
export function parseReminderFromMessage(text: string): { reminderText: string; at: number } | null {
  const t = text.trim();
  const lower = t.toLowerCase();
  if (!/\bremind\b/.test(lower)) return null;

  const relMin = lower.match(/\bin\s+(\d+)\s*(?:minute|minutes|min)\b/);
  const relHour = lower.match(/\bin\s+(\d+)\s*(?:hour|hours)\b/);
  const relSec = lower.match(/\bin\s+(\d+)\s*(?:second|seconds|sec)\b/);
  let ms = 0;
  if (relMin) ms += Number(relMin[1]) * 60_000;
  if (relHour) ms += Number(relHour[1]) * 3_600_000;
  if (relSec) ms += Number(relSec[1]) * 1000;
  if (!ms && /\bin an hour\b/.test(lower)) ms = 3_600_000;
  if (!ms && /\bin half an hour\b/.test(lower)) ms = 1_800_000;
  if (!ms) return null;

  const stripped = t.replace(/^[^:]*remind(?:\s+me)?\s*(?:about|to)?\s*/i, "").replace(/\s+in\s+.*$/i, "");
  const reminderText = stripped.trim() || t;
  return { reminderText, at: Date.now() + ms };
}
