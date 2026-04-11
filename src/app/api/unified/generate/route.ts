import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUsageLimits } from "@/lib/unified-limits";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";
import { chatMessageCost } from "@/lib/unified-revenue";

const threadMsgSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(32000),
});

const bodySchema = z
  .object({
    /** Single-turn (legacy): one user message. */
    prompt: z.string().min(1).max(8000).optional(),
    /** Multi-turn: full Anthropic message list; must start with user and end with user. */
    messages: z.array(threadMsgSchema).max(40).optional(),
    platform: z.string().max(64).optional(),
    contentType: z.string().max(64).optional(),
    options: z
      .object({
        tone: z.string().max(64).optional(),
        maxLength: z.number().int().positive().max(32000).optional(),
        includeHashtags: z.boolean().optional(),
        includeEmojis: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasPrompt = Boolean(data.prompt?.trim());
    const hasMsgs = (data.messages?.length ?? 0) > 0;
    if (!hasPrompt && !hasMsgs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide prompt or messages",
        path: ["prompt"],
      });
    }
    if (hasMsgs && data.messages) {
      const m = data.messages;
      if (m[0].role !== "user") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Thread must start with a user message",
          path: ["messages", 0, "role"],
        });
      }
      if (m[m.length - 1].role !== "user") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Last message must be from the user",
          path: ["messages", m.length - 1, "role"],
        });
      }
      for (let i = 0; i < m.length - 1; i++) {
        if (m[i].role === m[i + 1].role) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Messages must alternate user and assistant",
            path: ["messages", i],
          });
          break;
        }
      }
    }
  });

function extractAnthropicText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as { content?: Array<{ type?: string; text?: string }> };
  if (!Array.isArray(d.content)) return "";
  return d.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text as string)
    .join("\n");
}

function buildContentSystemPrompt(
  platform?: string,
  contentType?: string,
  options?: z.infer<typeof bodySchema>["options"],
): string {
  const parts = [
    "You are an expert social media content creator.",
    "Generate engaging, high-quality content that performs well on social media.",
    platform ? `Target platform: ${platform}` : "",
    contentType ? `Content type: ${contentType}` : "",
    options?.tone ? `Tone: ${options.tone}` : "",
    options?.maxLength
      ? `Maximum length: approximately ${options.maxLength} characters`
      : "",
    options?.includeHashtags ? "Include relevant hashtags where appropriate." : "",
    options?.includeEmojis ? "Use appropriate emojis sparingly." : "",
    "Return ONLY the generated content — no explanations or meta-commentary.",
  ];
  return parts.filter(Boolean).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { prompt, messages: threadMessages, platform, contentType, options } =
      parsed.data;

    const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> =
      threadMessages && threadMessages.length > 0
        ? threadMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }))
        : [{ role: "user", content: prompt! }];
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const limits = await checkUsageLimits(session.user.id);
    if (!limits.canGenerate) {
      return NextResponse.json(
        {
          error: "Usage limit reached",
          code: "LIMIT_REACHED",
          message: `You've reached your generation limit for this period. Upgrade for more.`,
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
    const inputChars = anthropicMessages.reduce(
      (n, m) => n + m.content.length,
      0,
    );
    const cost = chatMessageCost(400 + Math.min(12000, Math.floor(inputChars / 3)));
    if (profile.unifiedCredits < cost) {
      return NextResponse.json(
        { error: "Insufficient unified credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }

    const systemPrompt = buildContentSystemPrompt(platform, contentType, options);
    const model = "claude-sonnet-4-20250514";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const errJson = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      console.error("Anthropic error:", errJson);
      return NextResponse.json(
        { error: errJson.error?.message ?? "AI generation failed" },
        { status: response.status >= 400 ? response.status : 500 },
      );
    }

    const data = (await response.json()) as {
      content?: unknown;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const generatedContent = extractAnthropicText(data).trim();
    if (!generatedContent) {
      return NextResponse.json(
        { error: "Empty model response" },
        { status: 502 },
      );
    }

    const updated = await prisma.unifiedStudioProfile.update({
      where: { id: profile.id },
      data: { unifiedCredits: { decrement: cost } },
    });

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "content_generation",
        properties: {
          platform: platform ?? null,
          contentType: contentType ?? null,
          promptLength: inputChars,
          turns: anthropicMessages.length,
          contentLength: generatedContent.length,
          cost,
          model,
        },
      },
    });

    const usage = data.usage;
    const tokens =
      (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0);

    return NextResponse.json({
      success: true,
      content: generatedContent,
      creditsRemaining: updated.unifiedCredits,
      usage: {
        model,
        tokens,
        input_tokens: usage?.input_tokens,
        output_tokens: usage?.output_tokens,
      },
    });
  } catch (error: unknown) {
    console.error("Generate route error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 },
    );
  }
}
