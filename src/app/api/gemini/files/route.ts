import { NextResponse, type NextRequest } from "next/server";
import { getServerMaxFileBytes } from "@/lib/attachment-config";
import { waitForGeminiFileActive } from "@/lib/gemini-files";
import { guardChatSendBalanceOnly } from "@/lib/chat-route-guard";
import { createGeminiClient } from "@/lib/gemini-server";
import { parseModelTierBody } from "@/lib/model-tier";
import type { ModelTier } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const ai = createGeminiClient();
  if (!ai) {
    return NextResponse.json(
      { error: "Set GEMINI_API_KEY to upload files to Gemini." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const tierField = form.get("model");
  const tier = parseModelTierBody({
    model:
      typeof tierField === "string" && tierField.trim()
        ? (tierField as ModelTier)
        : ("glm-4-flash" as ModelTier),
  });
  if (!tier) {
    return NextResponse.json({ error: "Invalid model tier" }, { status: 400 });
  }

  const gated = await guardChatSendBalanceOnly(req, {
    model: tier,
    thinking: false,
    mode: "chat",
  });
  if (gated) return gated;

  const rawFiles = form.getAll("file");
  const files = rawFiles.filter((x): x is File => x instanceof File && x.size > 0);
  if (!files.length) {
    return NextResponse.json({ error: 'No files (use form field "file").' }, { status: 400 });
  }

  const maxBytes = getServerMaxFileBytes();
  const out: Array<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    geminiFileUri: string;
    geminiFileName: string;
  }> = [];

  try {
    for (const blob of files) {
      if (blob.size > maxBytes) {
        return NextResponse.json(
          { error: `"${blob.name}" exceeds max size (${maxBytes} bytes).` },
          { status: 413 },
        );
      }

      const mimeType = blob.type || "application/octet-stream";
      const uploaded = await ai.files.upload({
        file: blob,
        config: {
          mimeType,
          displayName: blob.name,
        },
      });

      if (!uploaded.name) {
        return NextResponse.json({ error: "Gemini upload did not return a file name." }, { status: 502 });
      }

      const ready = await waitForGeminiFileActive(ai, uploaded.name);

      out.push({
        id: crypto.randomUUID(),
        name: blob.name,
        mimeType: ready.mimeType ?? mimeType,
        sizeBytes: ready.sizeBytes ?? blob.size,
        geminiFileUri: ready.uri,
        geminiFileName: uploaded.name,
      });
    }

    return NextResponse.json({ files: out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "File upload failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
