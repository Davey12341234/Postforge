import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { moderateOpenAIText } from "@/lib/image-gen/moderation";
import { getOpenAIClient, extractResponsesOutputText } from "@/lib/openai-responses";
import { prisma } from "@/lib/prisma";
import {
  canUseOpenAiChat,
  checkUsageLimits,
  getUserPlanKey,
} from "@/lib/unified-limits";
import { applyXpAndLevel, getOrCreateUnifiedProfile } from "@/lib/unified-profile";
import { chatMessageCost } from "@/lib/unified-revenue";

function extractAnthropicText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as { content?: Array<{ type?: string; text?: string }> };
  if (!Array.isArray(d.content)) return "";
  return d.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text as string)
    .join("\n");
}

function resolveChatProvider(body: {
  provider?: string;
}): "anthropic" | "openai" {
  const env = process.env.UNIFIED_CHAT_PROVIDER;
  if (env === "openai" || env === "anthropic") return env;
  if (body.provider === "openai" || body.provider === "anthropic") {
    return body.provider;
  }
  return "anthropic";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      messages?: Array<{ role: string; content: string }>;
      system?: string;
      max_tokens?: number;
      model?: string;
      provider?: string;
      resetOpenAiConversation?: boolean;
    };

    const {
      messages,
      system = "You are a concise, creative social media content assistant. Help with hooks, captions, and CTAs. Keep replies scannable.",
      max_tokens = 1200,
      model: modelOverride,
      resetOpenAiConversation,
    } = body;

    const provider = resolveChatProvider(body);

    const profileEarly = await getOrCreateUnifiedProfile(session.user.id);

    if (provider === "openai" && resetOpenAiConversation === true) {
      await prisma.unifiedStudioProfile.update({
        where: { id: profileEarly.id },
        data: { openaiChatConversationId: null },
      });
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ reset: true, provider: "openai" });
      }
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    const limits = await checkUsageLimits(session.user.id);
    if (!limits.canGenerate) {
      return NextResponse.json(
        {
          error: "Usage limit reached",
          code: "LIMIT_REACHED",
          message: "Generation limit reached for this period.",
          limits: {
            remainingCredits: limits.remainingCredits,
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
    const cost = chatMessageCost(800);
    if (profile.unifiedCredits < cost) {
      return NextResponse.json(
        { error: "Insufficient unified credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }

    if (provider === "openai") {
      const planKey = await getUserPlanKey(session.user.id);
      if (!canUseOpenAiChat(planKey)) {
        return NextResponse.json(
          {
            error: "OpenAI chat is available on Pro, Business, and Enterprise.",
            code: "FEATURE_REQUIRES_UPGRADE",
            feature: "openai_chat",
            plan: planKey,
            upgradeUrl: "/unified/pricing",
          },
          { status: 402 },
        );
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY is not configured" },
          { status: 500 },
        );
      }

      const userTurns = messages.filter((m) => m.role === "user");
      const lastUser = userTurns[userTurns.length - 1]?.content?.trim() ?? "";
      if (!lastUser) {
        return NextResponse.json(
          { error: "Last user message is required" },
          { status: 400 },
        );
      }

      const mod = await moderateOpenAIText(
        lastUser,
        "Message blocked by moderation policy.",
      );
      if (!mod.ok) {
        return NextResponse.json({ error: mod.reason }, { status: 400 });
      }

      const openai = getOpenAIClient();
      const chatModel =
        modelOverride ??
        process.env.UNIFIED_OPENAI_CHAT_MODEL ??
        "gpt-4o";

      let conversationId = profile.openaiChatConversationId;
      if (!conversationId) {
        const conv = await openai.conversations.create({});
        conversationId = conv.id;
        await prisma.unifiedStudioProfile.update({
          where: { id: profile.id },
          data: { openaiChatConversationId: conversationId },
        });
      }

      const res = await openai.responses.create({
        model: chatModel,
        conversation: conversationId,
        input: lastUser,
        instructions: system,
        store: true,
      });

      const text = extractResponsesOutputText(res);
      if (!text) {
        return NextResponse.json(
          { error: "Empty model response" },
          { status: 502 },
        );
      }

      await prisma.unifiedStudioProfile.update({
        where: { id: profile.id },
        data: { unifiedCredits: { decrement: cost } },
      });

      await prisma.unifiedAnalyticsEvent.create({
        data: {
          profileId: profile.id,
          eventName: "unified_chat_message",
          properties: {
            cost,
            model: chatModel,
            provider: "openai",
            responseId: res.id,
          },
        },
      });

      const mission = await prisma.unifiedUserMission.findFirst({
        where: {
          profileId: profile.id,
          missionKey: "first_chat",
          status: "ACTIVE",
        },
      });
      if (mission) {
        const progress = mission.progress + 1;
        const completed = progress >= mission.target;
        await prisma.unifiedUserMission.update({
          where: { id: mission.id },
          data: {
            progress,
            status: completed ? "COMPLETED" : "ACTIVE",
            completedAt: completed ? new Date() : null,
          },
        });
        if (completed) {
          await applyXpAndLevel(profile.id, mission.xpReward);
        }
      }

      const usage = res.usage;
      return NextResponse.json({
        text,
        model: chatModel,
        provider: "openai",
        responseId: res.id,
        openaiConversationId: conversationId,
        usage: usage
          ? {
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
            }
          : undefined,
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const model = modelOverride ?? "claude-sonnet-4-20250514";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errJson = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      return NextResponse.json(
        { error: errJson.error?.message ?? "AI service unavailable" },
        { status: response.status },
      );
    }

    const data = (await response.json()) as unknown;
    const text = extractAnthropicText(data);

    await prisma.unifiedStudioProfile.update({
      where: { id: profile.id },
      data: { unifiedCredits: { decrement: cost } },
    });

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "unified_chat_message",
        properties: { cost, model, provider: "anthropic" },
      },
    });

    const mission = await prisma.unifiedUserMission.findFirst({
      where: {
        profileId: profile.id,
        missionKey: "first_chat",
        status: "ACTIVE",
      },
    });
    if (mission) {
      const progress = mission.progress + 1;
      const completed = progress >= mission.target;
      await prisma.unifiedUserMission.update({
        where: { id: mission.id },
        data: {
          progress,
          status: completed ? "COMPLETED" : "ACTIVE",
          completedAt: completed ? new Date() : null,
        },
      });
      if (completed) {
        await applyXpAndLevel(profile.id, mission.xpReward);
      }
    }

    const usage = (data as { usage?: { input_tokens?: number; output_tokens?: number } })
      .usage;
    return NextResponse.json({
      text,
      model,
      provider: "anthropic",
      usage,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("unified chat:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
