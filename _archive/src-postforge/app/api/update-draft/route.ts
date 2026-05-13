import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchBodySchema = z.object({
  draftId: z.string().min(1),
  caption: z.string(),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = session.user.orgId;

    const json: unknown = await req.json();
    const parsed = patchBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { draftId, caption } = parsed.data;

    const draft = await prisma.draft.findFirst({
      where: { id: draftId, organizationId: orgId },
    });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    await prisma.draft.update({
      where: { id: draftId },
      data: { caption },
    });

    return NextResponse.json({ success: true, draftId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
