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
    const { topic, postCount, brandId: inputBrandId } = parseResult.data;

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
            {
              role: "system",
              content: `Generate ${postCount} unique social media posts about the given topic. Respond with JSON: { "posts": [{ "caption": "..." }] }`,
            },
            { role: "user", content: `Topic: ${topic}` },
          ],
          temperature: 0.8,
          response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) throw new Error("Empty AI response");

        const parsed = JSON.parse(raw) as {
          posts?: Array<{ caption?: string; content?: string }>;
        };
        const posts = (parsed.posts || []).slice(0, postCount);

        const draftInputs = posts.map((p, i) => ({
          caption: p.caption || p.content || "",
          suggestedAt: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
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
