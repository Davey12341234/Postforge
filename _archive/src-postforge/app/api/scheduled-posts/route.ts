import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrganizationFromSession } from "@/lib/session-utils";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const org = await getOrganizationFromSession();
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { cursor, limit } = parsed.data;

  const posts = await prisma.scheduledPost.findMany({
    where: { organizationId: org.organizationId },
    take: limit + 1,
    ...(cursor
      ? {
          skip: 1,
          cursor: { id: cursor },
        }
      : {}),
    orderBy: { scheduledAt: "asc" },
  });

  let nextCursor: string | null = null;
  let list = posts;
  if (posts.length > limit) {
    const next = posts.pop();
    nextCursor = next?.id ?? null;
    list = posts;
  }

  return NextResponse.json({ posts: list, nextCursor });
}
