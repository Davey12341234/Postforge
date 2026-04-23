/** Current localStorage prefix — see `migrateLegacyLocalStorageOnce`. */
export const LS_PREFIX = "bbgpt_";

/** Legacy prefix; migrated on first client load. */
export const LEGACY_LS_PREFIX = "babygpt_";

export function lsKey(name: string): string {
  return `${LS_PREFIX}${name}`;
}

/**
 * Copy `babygpt_*` keys to `bbgpt_*` when the new key is absent (one-time UX migration).
 */
export function migrateLegacyLocalStorageOnce(): void {
  if (typeof window === "undefined") return;
  try {
    const done = sessionStorage.getItem("bbgpt_legacy_migrated_v1");
    if (done === "1") return;

    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (!k.startsWith(LEGACY_LS_PREFIX)) continue;
      const suffix = k.slice(LEGACY_LS_PREFIX.length);
      const nk = `${LS_PREFIX}${suffix}`;
      if (!localStorage.getItem(nk) && localStorage.getItem(k) != null) {
        localStorage.setItem(nk, localStorage.getItem(k)!);
      }
    }
    sessionStorage.setItem("bbgpt_legacy_migrated_v1", "1");
  } catch {
    /* quota / privacy mode */
  }
}

if (typeof window !== "undefined") {
  migrateLegacyLocalStorageOnce();
}
