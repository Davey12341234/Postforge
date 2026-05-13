import { lsKey } from "@/lib/storage";

const KEY = lsKey("time_capsule_v1");

export type TimeCapsule = {
  id: string;
  message: string;
  revealAt: number;
  createdAt: number;
  /** Set when user dismissed the reveal modal */
  openedAt?: number;
};

function loadAll(): TimeCapsule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TimeCapsule[];
  } catch {
    return [];
  }
}

function saveAll(items: TimeCapsule[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listTimeCapsules(): TimeCapsule[] {
  return loadAll().sort((a, b) => a.revealAt - b.revealAt);
}

export function addTimeCapsule(c: TimeCapsule) {
  const all = loadAll();
  all.push(c);
  saveAll(all);
}

export function removeTimeCapsule(id: string) {
  saveAll(loadAll().filter((x) => x.id !== id));
}

export function markCapsuleOpened(id: string) {
  const all = loadAll();
  const i = all.findIndex((x) => x.id === id);
  if (i === -1) return;
  all[i] = { ...all[i], openedAt: Date.now() };
  saveAll(all);
}

/** Next capsule whose time has passed and was not opened yet. */
export function nextDueTimeCapsule(now = Date.now()): TimeCapsule | null {
  const all = loadAll();
  const pending = all.filter((c) => c.revealAt <= now && !c.openedAt);
  pending.sort((a, b) => a.revealAt - b.revealAt);
  return pending[0] ?? null;
}
