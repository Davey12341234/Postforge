-- CreateEnum
CREATE TYPE "UnifiedImageProvider" AS ENUM ('DALLE3');

-- CreateEnum
CREATE TYPE "UnifiedImageStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "unified_generated_images" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "enhancedPrompt" TEXT,
    "provider" "UnifiedImageProvider" NOT NULL DEFAULT 'DALLE3',
    "openaiRevisedPrompt" TEXT,
    "size" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'png',
    "publicUrl" TEXT NOT NULL,
    "transientUrl" TEXT,
    "costCredits" INTEGER NOT NULL,
    "status" "UnifiedImageStatus" NOT NULL DEFAULT 'COMPLETED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_generated_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unified_generated_images_profileId_idx" ON "unified_generated_images"("profileId");

-- CreateIndex
CREATE INDEX "unified_generated_images_profileId_createdAt_idx" ON "unified_generated_images"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "unified_generated_images" ADD CONSTRAINT "unified_generated_images_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
