import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dalle3CreditCost } from "@/lib/image-gen/costs";
import { generateDalle3Image } from "@/lib/image-gen/dalle3";
import { moderateImagePrompt } from "@/lib/image-gen/moderation";
import { absolutePublicUrl, persistGeneratedImage } from "@/lib/image-gen/persist";
import { inngest } from "@/lib/inngest";
import { mergeStyleHint } from "@/lib/image-gen/prompt";
import { imageGenerateBodySchema } from "@/lib/image-gen/types";
import { checkUsageLimits } from "@/lib/unified-limits";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";

function parseDimensions(size: string): { width: number; height: number } {
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

    const json: unknown = await req.json();
    const parsed = imageGenerateBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { prompt, size, quality, styleHint } = parsed.data;
    const mergedPrompt = mergeStyleHint(prompt, styleHint);

    const mod = await moderateImagePrompt(mergedPrompt);
    if (!mod.ok) {
      return NextResponse.json({ error: mod.reason }, { status: 400 });
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
    const cost = dalle3CreditCost(size, quality);
    if (profile.unifiedCredits < cost) {
      return NextResponse.json(
        {
          error: "Insufficient unified credits",
          code: "INSUFFICIENT_CREDITS",
        },
        { status: 402 },
      );
    }

    const dalle = await generateDalle3Image({
      prompt: mergedPrompt,
      size,
      quality,
    });

    const id = randomUUID();
    const { width, height } = parseDimensions(size);

    let publicUrl = dalle.url;
    let imageFormat = "png";
    try {
      const persisted = await persistGeneratedImage({
        userId: session.user.id,
        imageId: id,
        sourceUrl: dalle.url,
      });
      publicUrl = persisted.publicUrl;
      imageFormat = persisted.format;
    } catch (e) {
      console.error("Image persist failed, using transient OpenAI URL:", e);
    }

    const [row, updated] = await prisma.$transaction([
      prisma.unifiedGeneratedImage.create({
        data: {
          id,
          profileId: profile.id,
          prompt,
          enhancedPrompt: mergedPrompt !== prompt ? mergedPrompt : null,
          provider: "DALLE3",
          openaiRevisedPrompt: dalle.revisedPrompt,
          size,
          quality,
          width,
          height,
          format: imageFormat,
          publicUrl,
          transientUrl: dalle.url,
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
        eventName: "image_generation",
        properties: {
          imageId: id,
          size,
          quality,
          costCredits: cost,
          provider: "DALLE3",
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
        revisedPrompt: dalle.revisedPrompt,
      },
      creditsRemaining: updated.unifiedCredits,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Image generation failed";
    console.error("unified images/generate:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Query id is required" }, { status: 400 });
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);
    const row = await prisma.unifiedGeneratedImage.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      image: {
        id: row.id,
        status: row.status,
        publicUrl: row.publicUrl,
        absoluteUrl: absolutePublicUrl(row.publicUrl),
        width: row.width,
        height: row.height,
        prompt: row.prompt,
        createdAt: row.createdAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("unified images/generate GET:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
