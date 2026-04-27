import { NextResponse, type NextRequest } from "next/server";
import { guardChatSend } from "@/lib/chat-route-guard";
import { requestGeminiNativeImage } from "@/lib/gemini-native-image";
import { createGeminiClient } from "@/lib/gemini-server";
import { parseModelTierBody } from "@/lib/model-tier";
import type { ModelTier } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  prompt: string;
  model?: ModelTier;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const tier = parseModelTierBody({ model: body.model ?? "glm-4-flash" });
  if (!tier) {
    return NextResponse.json({ error: "Invalid model tier" }, { status: 400 });
  }

  const ai = createGeminiClient();
  if (!ai) {
    return NextResponse.json(
      { error: "Set GEMINI_API_KEY to generate images with Gemini." },
      { status: 503 },
    );
  }

  const gated = await guardChatSend(req, {
    model: tier,
    thinking: false,
    mode: "chat",
  });
  if (gated) return gated;

  try {
    const result = await requestGeminiNativeImage(ai, prompt);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({
      mimeType: result.mimeType,
      imageBase64: result.imageBase64,
      model: result.model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
