import { describe, expect, it } from "vitest";
import { LEVELS, computeLevelFromXp, xpProgressInLevel } from "@/lib/unified-gamification";

/**
 * Mirrors `unified-studio-client` level path: segment shows unlocked when xp >= l.min.
 */
function levelPathUnlockedStates(xpTotal: number): boolean[] {
  return LEVELS.map((l) => xpTotal >= l.min);
}

describe("dashboard level path (lock / unlock)", () => {
  it("locks all segments above current XP threshold", () => {
    expect(levelPathUnlockedStates(0)).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(levelPathUnlockedStates(499)).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it("unlocks Strategist at 500 XP", () => {
    const u = levelPathUnlockedStates(500);
    expect(u[0]).toBe(true);
    expect(u[1]).toBe(true);
    expect(u[2]).toBe(false);
  });

  it("full unlock at Icon tier threshold", () => {
    expect(levelPathUnlockedStates(15000).every(Boolean)).toBe(true);
  });
});

describe("computeLevelFromXp / xpProgressInLevel", () => {
  it("levels up through thresholds", () => {
    expect(computeLevelFromXp(0)).toBe(1);
    expect(computeLevelFromXp(500)).toBe(2);
    expect(computeLevelFromXp(2000)).toBe(3);
  });

  it("xpProgressInLevel returns stable shape for UI", () => {
    const p = xpProgressInLevel(750);
    expect(p.name).toBe("Strategist");
    expect(p.pct).toBeGreaterThan(0);
    expect(p.pct).toBeLessThanOrEqual(100);
  });
});
