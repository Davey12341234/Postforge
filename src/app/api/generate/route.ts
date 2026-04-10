import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InsufficientCreditsError } from "@/lib/constants";
import { generateRequestSchema } from "@/lib/validations";
import { getBrandFromSession } from "@/lib/session-utils";
import { withCreditValidation } from "@/services/credit-accounting";
import { generate30DayContentBatch } from "@/services/content-batch";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

const ALLOWED_POST_KEYS = new Set([
  "caption",
  "pillar",
  "platform",
  "suggestedAt",
]);

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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.user.orgId;
    const userId = session.user.id;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = generateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 },
      );
    }
    const { topic, postCount, brandId: inputBrandId, platforms } =
      parseResult.data;

    const brand = inputBrandId
      ? await prisma.brand.findFirst({
          where: { id: inputBrandId, organizationId },
        })
      : await getBrandFromSession(organizationId);

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const estimatedTokens = 400 * postCount;

    const systemPrompt = `You are an elite social media content strategist generating a batch of ${postCount} posts. Use professional but warm tone. Use short paragraphs and emojis sparingly for visual break-up. LinkedIn: 150-300 words. X: under 280 chars. Instagram: visual-first hooks. Adjust tone per platform context if provided. Strict JSON: { "posts": [{ "caption": "Exact post text here", "pillar": "Educational", "platform": "LINKEDIN" }] }`;

    const platformHint =
      platforms && platforms.length > 0
        ? ` Distribute posts across these platforms only (vary across posts): ${platforms.join(", ")}.`
        : "";
    const userPrompt = `Topic: ${topic}. Generate exactly ${postCount} posts using the context provided above.${platformHint} Return ONLY valid JSON.`;

    const batchId = await withCreditValidation(
      {
        orgId: organizationId,
        brandId: brand.id,
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

        const draftInputs = posts.map((p, i) => ({
          caption: p.caption || "",
          pillar: p.pillar,
          platform: p.platform,
          suggestedAt:
            p.suggestedAt ??
            new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        }));

        const id = await generate30DayContentBatch(
          organizationId,
          brand.id,
          userId,
          draftInputs,
        );

        return {
          inputTokens: completion.usage?.prompt_tokens ?? 0,
          outputTokens: completion.usage?.completion_tokens ?? 0,
          result: id,
        };
      },
    );

    const drafts = await prisma.draft.findMany({
      where: { batchId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, batchId, drafts },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
