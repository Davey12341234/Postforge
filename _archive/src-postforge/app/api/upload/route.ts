import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Image upload for publishing workflows (dev: local disk; prod: swap for CDN).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(mime)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Use JPEG, PNG, WebP, or GIF.",
        },
        { status: 400 },
      );
    }

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum 8MB.`,
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
    const filename = `${timestamp}_${randomString}.${extension}`;

    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      userId,
    );
    await mkdir(uploadsDir, { recursive: true });
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const publicUrl = `/uploads/${userId}/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        filename,
        url: publicUrl,
        publicUrl:
          process.env.NODE_ENV === "production"
            ? `${process.env.APP_URL ?? ""}${publicUrl}`
            : publicUrl,
        size: file.size,
        type: mime,
        width: null as number | null,
        height: null as number | null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("Upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
