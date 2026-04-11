import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getR2Client(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

export type PersistGeneratedImageResult = {
  publicUrl: string;
  format: string;
  bytes: number;
};

/**
 * Download OpenAI image URL → optional WebP (sharp) → R2 if configured, else
 * `public/uploads/{userId}/generated/`.
 */
/**
 * Persist raw image bytes (e.g. GPT Image edit returning `b64_json`) like {@link persistGeneratedImage}.
 */
export async function persistGeneratedImageBuffer(options: {
  userId: string;
  imageId: string;
  buffer: Buffer;
}): Promise<PersistGeneratedImageResult> {
  let buf = options.buffer;
  let format = "png";
  let ext = "png";

  try {
    const sharp = (await import("sharp")).default;
    buf = Buffer.from(await sharp(buf).webp({ quality: 85 }).toBuffer());
    format = "webp";
    ext = "webp";
  } catch (e) {
    console.warn("sharp WebP skipped, keeping PNG:", e);
  }

  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  const client = getR2Client();

  if (client && bucket && publicBase) {
    const key = `unified-generated/${options.userId}/${options.imageId}.${ext}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: new Uint8Array(buf),
        ContentType: format === "webp" ? "image/webp" : "image/png",
      }),
    );
    return {
      publicUrl: `${publicBase}/${key}`,
      format,
      bytes: buf.length,
    };
  }

  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    options.userId,
    "generated",
  );
  await mkdir(uploadsDir, { recursive: true });
  const filename = `${options.imageId}.${ext}`;
  const filepath = path.join(uploadsDir, filename);
  await writeFile(filepath, buf);
  const relativeUrl = `/uploads/${options.userId}/generated/${filename}`;
  return { publicUrl: relativeUrl, format, bytes: buf.length };
}

export async function persistGeneratedImage(options: {
  userId: string;
  imageId: string;
  sourceUrl: string;
}): Promise<PersistGeneratedImageResult> {
  const res = await fetch(options.sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status}`);
  }

  let buf = Buffer.from(await res.arrayBuffer());
  let format = "png";
  let ext = "png";

  try {
    const sharp = (await import("sharp")).default;
    buf = Buffer.from(await sharp(buf).webp({ quality: 85 }).toBuffer());
    format = "webp";
    ext = "webp";
  } catch (e) {
    console.warn("sharp WebP skipped, keeping PNG:", e);
  }

  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  const client = getR2Client();

  if (client && bucket && publicBase) {
    const key = `unified-generated/${options.userId}/${options.imageId}.${ext}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: new Uint8Array(buf),
        ContentType: format === "webp" ? "image/webp" : "image/png",
      }),
    );
    return {
      publicUrl: `${publicBase}/${key}`,
      format,
      bytes: buf.length,
    };
  }

  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    options.userId,
    "generated",
  );
  await mkdir(uploadsDir, { recursive: true });
  const filename = `${options.imageId}.${ext}`;
  const filepath = path.join(uploadsDir, filename);
  await writeFile(filepath, buf);
  const relativeUrl = `/uploads/${options.userId}/generated/${filename}`;
  return { publicUrl: relativeUrl, format, bytes: buf.length };
}

export function absolutePublicUrl(publicUrl: string): string {
  if (publicUrl.startsWith("http")) return publicUrl;
  const base = (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "").replace(
    /\/$/,
    "",
  );
  if (!base) return publicUrl;
  return `${base}${publicUrl}`;
}
