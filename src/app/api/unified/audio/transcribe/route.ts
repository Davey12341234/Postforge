import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { moderateOpenAIText } from "@/lib/image-gen/moderation";
import { getOpenAIClient } from "@/lib/openai-responses";
import { prisma } from "@/lib/prisma";
import { checkUsageLimits } from "@/lib/unified-limits";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";
import { chatMessageCost } from "@/lib/unified-revenue";
import { toFile } from "openai";

const TRANSCRIBE_COST = chatMessageCost(200);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const fileEntry = form.get("file");
    if (!(fileEntry instanceof Blob) || fileEntry.size === 0) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
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
    if (profile.unifiedCredits < TRANSCRIBE_COST) {
      return NextResponse.json(
        { error: "Insufficient unified credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }

    const buf = Buffer.from(await fileEntry.arrayBuffer());
    const type = fileEntry.type || "";
    const ext = type.includes("wav")
      ? "wav"
      : type.includes("mpeg") || type.includes("mp3")
        ? "mp3"
        : type.includes("mp4") || type.includes("m4a")
          ? "m4a"
          : "webm";
    const upload = await toFile(buf, `audio.${ext}`);

    const modelRaw = form.get("model");
    const model =
      typeof modelRaw === "string" && modelRaw.trim()
        ? modelRaw.trim()
        : "whisper-1";

    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: upload,
      model,
    });

    const text =
      typeof transcription.text === "string" ? transcription.text.trim() : "";
    if (text) {
      const mod = await moderateOpenAIText(
        text,
        "Transcription blocked by moderation policy.",
      );
      if (!mod.ok) {
        return NextResponse.json({ error: mod.reason }, { status: 400 });
      }
    }

    await prisma.unifiedStudioProfile.update({
      where: { id: profile.id },
      data: { unifiedCredits: { decrement: TRANSCRIBE_COST } },
    });

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "audio_transcription",
        properties: { cost: TRANSCRIBE_COST, model },
      },
    });

    const updated = await prisma.unifiedStudioProfile.findUnique({
      where: { id: profile.id },
      select: { unifiedCredits: true },
    });

    return NextResponse.json({
      text,
      model,
      costCredits: TRANSCRIBE_COST,
      creditsRemaining: updated?.unifiedCredits ?? 0,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Transcription failed";
    console.error("unified audio/transcribe:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
