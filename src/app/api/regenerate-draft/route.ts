import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InsufficientCreditsError } from "@/lib/constants";
import {
  failAndRefundRun,
  withCreditValidation,
} from "@/services/credit-accounting";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

const ALLOWED_POST_KEYS = new Set([
  "caption",
  "pillar",
  "platform",
  "suggestedAt",
]);

const postSchema = z.object({
  draftId: z.string().min(1),
  caption: z.string().optional(),
});

function stripMarkdownFences(s: string): string {
  let t = s.trim();
  t = t.replace(/^`{3,4}(?:json)?\s*/i, "").replace(/\s*`{3,4}$/m, "");
  t = t.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  return t.replace(/`{4,}/g, "");
}

function extractPostsArray(parsed: unknown): unknown[] | null {
  if (!parsed || typeof parsed !== "object") return null;
  const po = parsed as Record<string, unknown>;
  if (Array.isArray(po.posts)) return po.posts;
  return null;
}

function pickPostFields(
  raw: Record<string, unknown>,
): {
  caption: string;
  pillar?: string;
  platform?: string;
  suggestedAt?: Date;
} {
  const next: Record<string, unknown> = {};
  for (const k of ALLOWED_POST_KEYS) {
    if (k in raw) next[k] = raw[k];
  }
  const caption = typeof next.caption === "string" ? next.caption : "";
  const pillar = typeof next.pillar === "string" ? next.pillar : undefined;
  const platform = typeof next.platform === "string" ? next.platform : undefined;
  let suggestedAt: Date | undefined;
  if (next.suggestedAt != null) {
    if (typeof next.suggestedAt === "string") {
      const d = new Date(next.suggestedAt);
      if (!Number.isNaN(d.getTime())) suggestedAt = d;
    }
  }
  return { caption, pillar, platform, suggestedAt };
}

function parseAiPostsJson(
  raw: string,
  postCount: number,
): Array<{
  caption: string;
  pillar?: string;
  platform?: string;
  suggestedAt?: Date;
}> {
  const cleaned = stripMarkdownFences(raw);

  let objects: Array<Record<string, unknown>> | null = null;

  const tryParseObject = (s: string): void => {
    try {
      const parsed = JSON.parse(s) as unknown;
      const posts = extractPostsArray(parsed);
      if (!posts) return;
      objects = posts.map((p) => {
        if (!p || typeof p !== "object") return pickPostFields({});
        return pickPostFields(p as Record<string, unknown>);
      }) as Array<Record<string, unknown>>;
    } catch {
      /* fall through */
    }
  };

  tryParseObject(cleaned);

  if (!objects) {
    const postsMatch = cleaned.match(/"posts"\s*:\s*(\[[\s\S]*\])/);
    if (postsMatch) {
      try {
        const arr = JSON.parse(postsMatch[1]) as unknown;
        if (Array.isArray(arr)) {
          objects = arr.map((p) => {
            if (!p || typeof p !== "object") return pickPostFields({});
            return pickPostFields(p as Record<string, unknown>);
          }) as Array<Record<string, unknown>>;
        }
      } catch {
        objects = null;
      }
    }
  }

  if (!objects) {
    const anyArray = cleaned.match(/\[[\s\S]*\]/);
    if (anyArray) {
      try {
        const arr = JSON.parse(anyArray[0]) as unknown;
        if (Array.isArray(arr)) {
          objects = arr.map((p) => {
            if (!p || typeof p !== "object") return pickPostFields({});
            return pickPostFields(p as Record<string, unknown>);
          }) as Array<Record<string, unknown>>;
        }
      } catch {
        objects = null;
      }
    }
  }

  if (!objects) {
    return [];
  }

  return objects.slice(0, postCount).map((o) => ({
    caption: typeof o.caption === "string" ? o.caption : "",
    pillar: typeof o.pillar === "string" ? o.pillar : undefined,
    platform: typeof o.platform === "string" ? o.platform : undefined,
    suggestedAt:
      o.suggestedAt instanceof Date
        ? o.suggestedAt
        : typeof o.suggestedAt === "string"
          ? (() => {
              const d = new Date(o.suggestedAt);
              return Number.isNaN(d.getTime()) ? undefined : d;
            })()
          : undefined,
  }));
}

async function findAiRunForDraft(draft: {
  organizationId: string;
  brandId: string;
  createdAt: Date;
}) {
  return prisma.aiRun.findFirst({
    where: {
      organizationId: draft.organizationId,
      brandId: draft.brandId,
      runType: "BATCH_GENERATE",
      status: "COMPLETED",
      startedAt: { lte: draft.createdAt },
      completedAt: { gte: draft.createdAt },
    },
    orderBy: { completedAt: "desc" },
  });
}

async function refundCreditsBeforeRegenerate(
  draftId: string,
  reason: string,
): Promise<void> {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
  });
  if (!draft?.batchId) return;

  const run = await findAiRunForDraft(draft);
  if (!run) return;

  const peers = await prisma.draft.count({
    where: {
      batchId: draft.batchId,
      createdAt: {
        gte: run.startedAt,
        lte: run.completedAt ?? new Date(),
      },
    },
  });
  const n = Math.max(peers, 1);

  if (n <= 1) {
    await failAndRefundRun(run.id, reason);
    return;
  }

  const share = Math.ceil(run.reservedCredits / n);
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: draft.organizationId },
      data: { aiCredits: { increment: share } },
    });
    await tx.aiUsageLedger.create({
      data: {
        organizationId: draft.organizationId,
        amount: share,
        type: "REFUND",
        description: `${reason} (draft ${draftId})`,
      },
    });
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = session.user.orgId;

    const json = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { draftId, caption: bodyCaption } = parsed.data;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const draft = await prisma.draft.findFirst({
      where: { id: draftId, organizationId: orgId },
    });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const savedBatchId = draft.batchId;
    const savedBrandId = draft.brandId;
    const savedSuggestedAt = draft.suggestedAt;
    const savedCaption = draft.caption;
    const topicLine = (bodyCaption ?? savedCaption).slice(0, 2000);

    const estimatedTokens = 500;

    await refundCreditsBeforeRegenerate(draftId, "Regenerating draft");

    const postCount = 1;

    const systemPrompt = `You are an elite social media content strategist generating a batch of ${postCount} posts. Use professional but warm tone. Use short paragraphs and emojis sparingly for visual break-up. LinkedIn: 150-300 words. X: under 280 chars. Instagram: visual-first hooks. Adjust tone per platform context if provided. Strict JSON: { "posts": [{ "caption": "Exact post text here", "pillar": "Educational", "platform": "LINKEDIN" }] }`;

    const userPrompt = `Topic: ${topicLine}. Generate exactly ${postCount} posts using the context provided above. Return ONLY valid JSON.`;

    const firstPost = await withCreditValidation(
      {
        orgId,
        brandId: savedBrandId,
        model: "gpt-4o-mini",
        runType: "BATCH_GENERATE",
        estimatedTokens,
      },
      async (_runId) => {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) throw new Error("Empty AI response");

        const posts = parseAiPostsJson(raw, postCount);
        const first = posts[0] ?? { caption: "" };

        return {
          inputTokens: completion.usage?.prompt_tokens ?? 0,
          outputTokens: completion.usage?.completion_tokens ?? 0,
          result: first,
        };
      },
    );

    await prisma.draft.delete({ where: { id: draftId } });

    const newDraft = await prisma.draft.create({
      data: {
        organizationId: orgId,
        brandId: savedBrandId,
        batchId: savedBatchId,
        caption: firstPost.caption || "",
        pillar: firstPost.pillar,
        platform: firstPost.platform ?? "LINKEDIN",
        suggestedAt: savedSuggestedAt,
        status: "SUGGESTED",
      },
    });

    return NextResponse.json({ success: true, draftId: newDraft.id });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Regeneration failed" }, { status: 500 });
  }
}
