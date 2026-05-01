import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";

const SETTINGS_EVENT = "unified_user_settings";

const settingsSchema = z.record(z.string(), z.unknown());

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);

    const latest = await prisma.unifiedAnalyticsEvent.findFirst({
      where: {
        profileId: profile.id,
        eventName: SETTINGS_EVENT,
      },
      orderBy: { timestamp: "desc" },
    });

    const raw = latest?.properties;
    const settings =
      raw &&
      typeof raw === "object" &&
      raw !== null &&
      "settings" in raw &&
      typeof (raw as { settings?: unknown }).settings === "object"
        ? ((raw as { settings: Record<string, unknown> }).settings ?? {})
        : {};

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await request.json();
    const parsed = settingsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Settings must be a JSON object" },
        { status: 400 },
      );
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);

    const previous = await prisma.unifiedAnalyticsEvent.findFirst({
      where: { profileId: profile.id, eventName: SETTINGS_EVENT },
      orderBy: { timestamp: "desc" },
    });

    let merged: Record<string, unknown> = { ...parsed.data };
    if (previous?.properties && typeof previous.properties === "object") {
      const p = previous.properties as { settings?: Record<string, unknown> };
      if (p.settings && typeof p.settings === "object") {
        merged = { ...p.settings, ...parsed.data };
      }
    }

    const snapshot: Prisma.InputJsonObject = {
      settings: merged as Prisma.InputJsonObject,
      changedKeys: Object.keys(parsed.data),
      savedAt: new Date().toISOString(),
    };

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: SETTINGS_EVENT,
        properties: snapshot,
      },
    });

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "settings_updated",
        properties: {
          changedKeys: Object.keys(parsed.data),
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      settings: merged,
    });
  } catch (error: unknown) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
