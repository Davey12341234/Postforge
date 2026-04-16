import { DEFAULT_ATTACHMENT_BYTES } from "@/lib/attachment-presets";

/** When env is unset — tuned for typical hosted deploys; users can raise via env or the in-app limit picker. */
const DEFAULT_MAX = DEFAULT_ATTACHMENT_BYTES;

/** Above this size, uploads go to Gemini Files API (multipart) instead of inline base64 in JSON. */
const DEFAULT_INLINE_MAX = 4 * 1024 * 1024;

function parseBytes(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Server-side max per attached file (bytes). */
export function getServerMaxFileBytes(): number {
  return parseBytes(process.env.BABYGPT_MAX_FILE_BYTES, DEFAULT_MAX);
}

/** Client-side max (build-time env). */
export function getClientMaxFileBytes(): number {
  if (typeof window !== "undefined") {
    try {
      const fromLs = localStorage.getItem("babygpt_max_file_bytes_override");
      if (fromLs) return parseBytes(fromLs, DEFAULT_MAX);
    } catch {
      /* ignore */
    }
  }
  return parseBytes(process.env.NEXT_PUBLIC_MAX_FILE_BYTES, DEFAULT_MAX);
}

/**
 * Max size for inline base64 in the chat JSON body. Larger files upload via `/api/gemini/files` (multipart).
 * Set `BABYGPT_INLINE_ATTACHMENT_BYTES` on the server and `NEXT_PUBLIC_INLINE_ATTACHMENT_BYTES` for matching client builds.
 */
export function getInlineAttachmentMaxBytes(): number {
  const raw =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_INLINE_ATTACHMENT_BYTES
      : process.env.BABYGPT_INLINE_ATTACHMENT_BYTES ?? process.env.NEXT_PUBLIC_INLINE_ATTACHMENT_BYTES;
  return parseBytes(raw, DEFAULT_INLINE_MAX);
}
