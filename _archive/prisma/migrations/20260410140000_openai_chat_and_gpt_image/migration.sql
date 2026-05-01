-- AlterTable (enum UnifiedImageProvider is created in 20260411120000 — GPT_IMAGE is added in a later migration.)
ALTER TABLE "unified_studio_profiles" ADD COLUMN "openaiChatConversationId" TEXT;
