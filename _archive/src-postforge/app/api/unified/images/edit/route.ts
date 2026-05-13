import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gptImageEditCreditCost } from "@/lib/image-gen/costs";
import { moderateImagePrompt } from "@/lib/image-gen/moderation";
import { absolutePublicUrl, persistGeneratedImageBuffer } from "@/lib/image-gen/persist";
import { getOpenAIClient } from "@/lib/openai-responses";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest";
import {
  canUseMediaStudio,
  checkUsageLimits,
  getUserPlanKey,
} from "@/lib/unified-limits";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";
import { toFile } from "openai";

function parseDimensions(
  size: string | undefined,
): { width: number; height: number } {
  if (!size || size === "auto") return { width: 1024, height: 1024 };
  const parts = size.split("x").map((x) => Number.parseInt(x, 10));
  const w = parts[0] ?? 1024;
  const h = parts[1] ?? 1024;
  return { width: w, height: h };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const promptRaw = form.get("prompt");
    const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const imageEntry = form.get("image");
    if (!(imageEntry instanceof Blob) || imageEntry.size === 0) {
      return NextResponse.json(
        { error: "image file is required" },
        { status: 400 },
      );
    }

    const maskEntry = form.get("mask");
    const mask =
      maskEntry instanceof Blob && maskEntry.size > 0 ? maskEntry : undefined;

    const modelRaw = form.get("model");
    const model =
      typeof modelRaw === "string" && modelRaw.trim()
        ? modelRaw.trim()
        : "gpt-image-1.5";

    const mod = await moderateImagePrompt(prompt);
    if (!mod.ok) {
      return NextResponse.json({ error: mod.reason }, { status: 400 });
    }

    const planKey = await getUserPlanKey(session.user.id);
    if (!canUseMediaStudio(planKey)) {
      return NextResponse.json(
        {
          error:
            "GPT image editing is available on Pro, Business, and Enterprise.",
          code: "FEATURE_REQUIRES_UPGRADE",
          feature: "media_studio",
          plan: planKey,
          upgradeUrl: "/unified/pricing",
        },
        { status: 402 },
      );
    }

    const limits = await checkUsageLimits(session.user.id);
    if (!limits.canGenerate) {
      return NextResponse.json(
        {
          error: "Usage limit reached",
          code: "LIMIT_REACHED",
          limits: {
            remainingGenerations: limits.remainingGenerations,
            plan: limits.plan,
            resetDate: limits.resetDate,
          },
          upgradeUrl: limits.upgradeUrl,
        },
        { status: 402 },
      );
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);
    const cost = gptImageEditCreditCost();
    if (profile.unifiedCredits < cost) {
      return NextResponse.json(
        {
          error: "Insufficient unified credits",
          code: "INSUFFICIENT_CREDITS",
        },
        { status: 402 },
      );
    }

    const imageBuf = Buffer.from(await imageEntry.arrayBuffer());
    const imageFile = await toFile(imageBuf, "source.png");

    const openai = getOpenAIClient();
    const maskFile = mask
      ? await toFile(Buffer.from(await mask.arrayBuffer()), "mask.png")
      : undefined;

    const edited = await openai.images.edit({
      model,
      image: imageFile,
      ...(maskFile ? { mask: maskFile } : {}),
      prompt,
      n: 1,
      stream: false,
    });

    const first = edited.data?.[0];
    const b64 = first?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: "Image edit returned no data" },
        { status: 502 },
      );
    }

    const id = randomUUID();
    const rawPng = Buffer.from(b64, "base64");
    const sizeStr =
      typeof edited.size === "string" ? edited.size : "1024x1024";
    const { width, height } = parseDimensions(sizeStr);

    let publicUrl = "";
    let imageFormat = "png";
    try {
      const persisted = await persistGeneratedImageBuffer({
        userId: session.user.id,
        imageId: id,
        buffer: rawPng,
      });
      publicUrl = persisted.publicUrl;
      imageFormat = persisted.format;
    } catch (e) {
      console.error("Image edit persist failed:", e);
      return NextResponse.json(
        { error: "Failed to store edited image" },
        { status: 500 },
      );
    }

    const [row, updated] = await prisma.$transaction([
      prisma.unifiedGeneratedImage.create({
        data: {
          id,
          profileId: profile.id,
          prompt,
          enhancedPrompt: null,
          provider: "GPT_IMAGE",
          openaiRevisedPrompt: null,
          size: sizeStr,
          quality: String(edited.quality ?? "auto"),
          width,
          height,
          format: imageFormat,
          publicUrl,
          transientUrl: null,
          costCredits: cost,
          status: "COMPLETED",
        },
      }),
      prisma.unifiedStudioProfile.update({
        where: { id: profile.id },
        data: { unifiedCredits: { decrement: cost } },
      }),
    ]);

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "image_edit",
        properties: {
          imageId: id,
          model,
          costCredits: cost,
          provider: "GPT_IMAGE",
        },
      },
    });

    void inngest
      .send({
        name: "unified/image.generated",
        data: {
          imageId: id,
          profileId: profile.id,
          publicUrl: absolutePublicUrl(publicUrl),
          costCredits: cost,
        },
      })
      .catch((err: unknown) => console.error("inngest send:", err));

    return NextResponse.json({
      success: true,
      image: {
        id: row.id,
        status: row.status,
        publicUrl,
        absoluteUrl: absolutePublicUrl(publicUrl),
        width: row.width,
        height: row.height,
        costCredits: cost,
        model,
      },
      creditsRemaining: updated.unifiedCredits,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Image edit failed";
    console.error("unified images/edit:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
