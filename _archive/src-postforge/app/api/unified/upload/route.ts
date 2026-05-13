import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(mime)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 },
      );
    }

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max 8MB.`,
        },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const originalName =
      typeof (file as File).name === "string" ? (file as File).name : "upload";
    const extension = originalName.includes(".")
      ? originalName.split(".").pop()
      : "bin";
    const filename = `u_${timestamp}_${randomString}.${extension}`;

    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "unified",
      session.user.id,
    );
    await mkdir(uploadsDir, { recursive: true });
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const publicUrl = `/uploads/unified/${session.user.id}/${filename}`;

    const asset = await prisma.unifiedAsset.create({
      data: {
        profileId: profile.id,
        fileName: filename,
        fileType: mime,
        fileSize: file.size,
        url: publicUrl,
        publicUrl:
          process.env.NODE_ENV === "production"
            ? `${process.env.NEXTAUTH_URL ?? ""}${publicUrl}`
            : publicUrl,
        usageType: "INSTAGRAM_POST",
      },
    });

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "unified_asset_upload",
        properties: { assetId: asset.id, size: file.size },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: asset.id,
        filename,
        url: publicUrl,
        publicUrl: asset.publicUrl,
        size: file.size,
        type: mime,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("unified upload:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
