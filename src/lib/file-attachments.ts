import { v4 as uuidv4 } from "uuid";
import type { ChatAttachment, ModelTier } from "@/lib/types";
import { getClientMaxFileBytes, getInlineAttachmentMaxBytes } from "@/lib/attachment-config";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const idx = s.indexOf("base64,");
      resolve(idx >= 0 ? s.slice(idx + 7) : s);
    };
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

type PrepareOpts = {
  /** Current UI model tier — sent with multipart upload for billing guard. */
  modelTier: ModelTier;
};

/**
 * Builds attachments: small files stay inline base64; larger ones upload via `/api/gemini/files` (multipart).
 */
export async function filesToChatAttachments(
  files: File[],
  opts: PrepareOpts,
): Promise<{ ok: true; attachments: ChatAttachment[] } | { ok: false; error: string }> {
  const max = getClientMaxFileBytes();
  const inlineMax = getInlineAttachmentMaxBytes();

  type Step = { kind: "inline"; file: File } | { kind: "large"; file: File };
  const steps: Step[] = [];

  for (const file of files) {
    if (file.size > max) {
      return {
        ok: false,
        error: `"${file.name}" is too large (max ${formatBytes(max)}).`,
      };
    }
    steps.push(file.size <= inlineMax ? { kind: "inline", file } : { kind: "large", file });
  }

  const large = steps.filter((s): s is { kind: "large"; file: File } => s.kind === "large").map((s) => s.file);

  let uploaded: Array<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    geminiFileUri: string;
    geminiFileName: string;
  }> = [];

  if (large.length > 0) {
    const fd = new FormData();
    fd.append("model", opts.modelTier);
    for (const f of large) {
      fd.append("file", f, f.name);
    }
    const res = await fetch("/api/gemini/files", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      files?: typeof uploaded;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? "Could not upload files to Gemini (check GEMINI_API_KEY and size limits).",
      };
    }
    if (!data.files?.length || data.files.length !== large.length) {
      return { ok: false, error: "Unexpected response from file upload." };
    }
    uploaded = data.files;
  }

  const attachments: ChatAttachment[] = [];
  let u = 0;
  for (const step of steps) {
    if (step.kind === "inline") {
      try {
        const dataBase64 = await readFileAsBase64(step.file);
        attachments.push({
          id: uuidv4(),
          name: step.file.name,
          mimeType: step.file.type || "application/octet-stream",
          sizeBytes: step.file.size,
          dataBase64,
        });
      } catch {
        return { ok: false, error: `Could not read "${step.file.name}".` };
      }
    } else {
      const meta = uploaded[u];
      u += 1;
      if (!meta) {
        return { ok: false, error: "Upload mapping failed — try again." };
      }
      attachments.push({
        id: meta.id,
        name: meta.name,
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        geminiFileUri: meta.geminiFileUri,
        geminiFileName: meta.geminiFileName,
      });
    }
  }

  return { ok: true, attachments };
}
