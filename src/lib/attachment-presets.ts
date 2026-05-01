/** User-selectable per-file caps (mirrors “pick a tier” UX in Claude / ChatGPT / Grok attach flows). */
export const FILE_SIZE_PRESETS: { id: string; label: string; bytes: number }[] = [
  { id: "10", label: "10 MB", bytes: 10 * 1024 * 1024 },
  { id: "25", label: "25 MB", bytes: 25 * 1024 * 1024 },
  { id: "50", label: "50 MB", bytes: 50 * 1024 * 1024 },
  { id: "100", label: "100 MB", bytes: 100 * 1024 * 1024 },
  { id: "256", label: "256 MB", bytes: 256 * 1024 * 1024 },
  { id: "512", label: "512 MB", bytes: 512 * 1024 * 1024 },
];

/** Default when env is unset — practical for typical serverless hosts; raise via BBGPT_MAX_FILE_BYTES (legacy BABYGPT_MAX_FILE_BYTES). */
export const DEFAULT_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export function nearestPresetBytes(bytes: number): number {
  let best = FILE_SIZE_PRESETS[0]!.bytes;
  let bestDist = Math.abs(bytes - best);
  for (const p of FILE_SIZE_PRESETS) {
    const d = Math.abs(bytes - p.bytes);
    if (d < bestDist) {
      best = p.bytes;
      bestDist = d;
    }
  }
  return best;
}

export function presetLabelForBytes(bytes: number): string {
  const exact = FILE_SIZE_PRESETS.find((p) => p.bytes === bytes);
  return exact?.label ?? `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}
