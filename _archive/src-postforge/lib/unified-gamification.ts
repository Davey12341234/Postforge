/**
 * XP, levels, missions — Unified Content Studio.
 */

export type LevelDef = {
  min: number;
  max: number;
  name: string;
  icon: string;
};

/** XP thresholds: level N requires xpTotal >= min and < max (last level max = Infinity) */
export const LEVELS: LevelDef[] = [
  { min: 0, max: 500, name: "Creator", icon: "🌱" },
  { min: 500, max: 2000, name: "Strategist", icon: "⚡" },
  { min: 2000, max: 6000, name: "Influencer", icon: "🔥" },
  { min: 6000, max: 15000, name: "Authority", icon: "👑" },
  { min: 15000, max: Number.POSITIVE_INFINITY, name: "Icon", icon: "✨" },
];

export type MissionDef = {
  key: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
};

export const DEFAULT_MISSION_DEFINITIONS: MissionDef[] = [
  {
    key: "first_chat",
    title: "Say hello to the AI",
    description: "Send your first message in Create.",
    target: 1,
    xpReward: 50,
  },
  {
    key: "draft_three",
    title: "Draft builder",
    description: "Save 3 drafts from the chat or drafts tab.",
    target: 3,
    xpReward: 120,
  },
  {
    key: "streak_three",
    title: "On a roll",
    description: "Maintain a 3-day streak.",
    target: 3,
    xpReward: 200,
  },
];

export function computeLevelFromXp(xpTotal: number): number {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xpTotal >= LEVELS[i].min) level = i + 1;
  }
  return Math.min(level, LEVELS.length);
}

export function xpProgressInLevel(
  xpTotal: number,
): { levelIndex: number; pct: number; name: string; icon: string } {
  const levelIndex = Math.max(
    0,
    LEVELS.findIndex((l, i) => {
      const next = LEVELS[i + 1];
      return xpTotal >= l.min && (!next || xpTotal < next.min);
    }),
  );
  const L = LEVELS[levelIndex] ?? LEVELS[0];
  const span = L.max === Number.POSITIVE_INFINITY ? 1 : L.max - L.min;
  const pct =
    L.max === Number.POSITIVE_INFINITY
      ? 100
      : Math.min(100, Math.max(0, ((xpTotal - L.min) / span) * 100));
  return {
    levelIndex,
    pct: Number.isFinite(pct) ? pct : 100,
    name: L.name,
    icon: L.icon,
  };
}
