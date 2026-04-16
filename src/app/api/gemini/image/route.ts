import { Modality } from "@google/genai";
import { NextResponse, type NextRequest } from "next/server";
import { guardChatSend } from "@/lib/chat-route-guard";
import { createGeminiClient, getGeminiImageModel } from "@/lib/gemini-server";
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

  const imageModel = getGeminiImageModel();

  try {
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: prompt,
      config: {
        // Image-capable models expect image (and optionally text) in the response modalities.
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    let mimeType = "image/png";
    let base64: string | null = null;

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        base64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType ?? mimeType;
        break;
      }
    }

    if (!base64) {
      const textFallback = response.text?.trim();
      return NextResponse.json(
        {
          error: textFallback || "No image returned — try a different prompt or GEMINI_IMAGE_MODEL.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      mimeType,
      imageBase64: base64,
      model: imageModel,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
