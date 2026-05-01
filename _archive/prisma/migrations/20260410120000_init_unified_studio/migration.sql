-- CreateEnum
CREATE TYPE "UnifiedSubscriptionTier" AS ENUM ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UnifiedMissionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'LOCKED');

-- CreateEnum
CREATE TYPE "UnifiedDraftStatus" AS ENUM ('DRAFT', 'READY', 'SCHEDULED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "UnifiedAssetUsageType" AS ENUM ('INSTAGRAM_POST', 'INSTAGRAM_STORY', 'INSTAGRAM_REEL', 'FACEBOOK_POST', 'THUMBNAIL', 'PROFILE_PICTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "UnifiedPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "UnifiedRetentionCampaignType" AS ENUM ('WIN_BACK', 'FEATURE_UPDATE', 'PROMOTIONAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planId" TEXT NOT NULL DEFAULT 'FREE',
    "aiCredits" INTEGER NOT NULL DEFAULT 0,
    "activationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "firstScheduledPostAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "runType" TEXT NOT NULL,
    "estimatedTokens" INTEGER NOT NULL,
    "reservedCredits" INTEGER NOT NULL,
    "actualInputTokens" INTEGER,
    "actualOutputTokens" INTEGER,
    "actualTotalTokens" INTEGER,
    "chargedCredits" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLedger" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "platform" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedPost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "totalShares" INTEGER NOT NULL DEFAULT 0,
    "totalSaves" INTEGER NOT NULL DEFAULT 0,
    "totalReach" INTEGER NOT NULL DEFAULT 0,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "batchId" TEXT,
    "repurposedFromId" TEXT,
    "caption" TEXT NOT NULL,
    "pillar" TEXT,
    "visualBrief" TEXT,
    "platform" TEXT,
    "suggestedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_studio_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "lastStreakDate" TIMESTAMP(3),
    "subscriptionTier" "UnifiedSubscriptionTier" NOT NULL DEFAULT 'FREE',
    "unifiedCredits" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unified_studio_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_user_missions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "missionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 1,
    "status" "UnifiedMissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unified_user_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_user_achievements" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_studio_drafts" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "platform" TEXT,
    "status" "UnifiedDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unified_studio_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_conversation_sessions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unified_conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_conversation_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_studio_notifications" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_studio_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_analytics_events" (
    "id" TEXT NOT NULL,
    "profileId" TEXT,
    "sessionId" TEXT,
    "eventName" TEXT NOT NULL,
    "properties" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_assets" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "usageType" "UnifiedAssetUsageType" NOT NULL,
    "draftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_payments" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "UnifiedPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeInvoiceId" TEXT,
    "stripeCustomerId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unified_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_subscriptions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "monthlyCreditsLimit" INTEGER NOT NULL DEFAULT 100,
    "aiGenerationsLimit" INTEGER NOT NULL DEFAULT 50,
    "draftStorageLimit" INTEGER NOT NULL DEFAULT 20,
    "teamMembersLimit" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "unified_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_invoices" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "amountPaidCents" INTEGER NOT NULL,
    "amountDueCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "invoicePdf" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_referrals" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "referralCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rewardCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "unified_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_retention_campaigns" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "campaignType" "UnifiedRetentionCampaignType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_retention_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Organization_planId_idx" ON "Organization"("planId");

-- CreateIndex
CREATE INDEX "Organization_activationStatus_idx" ON "Organization"("activationStatus");

-- CreateIndex
CREATE INDEX "Brand_organizationId_idx" ON "Brand"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "AiRun_organizationId_idx" ON "AiRun"("organizationId");

-- CreateIndex
CREATE INDEX "AiRun_brandId_idx" ON "AiRun"("brandId");

-- CreateIndex
CREATE INDEX "AiRun_status_idx" ON "AiRun"("status");

-- CreateIndex
CREATE INDEX "AiRun_organizationId_startedAt_idx" ON "AiRun"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "AiUsageLedger_organizationId_idx" ON "AiUsageLedger"("organizationId");

-- CreateIndex
CREATE INDEX "AiUsageLedger_organizationId_createdAt_idx" ON "AiUsageLedger"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduledPost_organizationId_idx" ON "ScheduledPost"("organizationId");

-- CreateIndex
CREATE INDEX "ScheduledPost_brandId_idx" ON "ScheduledPost"("brandId");

-- CreateIndex
CREATE INDEX "ScheduledPost_organizationId_status_idx" ON "ScheduledPost"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ScheduledPost_scheduledAt_idx" ON "ScheduledPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "PublishedPost_organizationId_idx" ON "PublishedPost"("organizationId");

-- CreateIndex
CREATE INDEX "PublishedPost_brandId_idx" ON "PublishedPost"("brandId");

-- CreateIndex
CREATE INDEX "PublishedPost_organizationId_engagement_idx" ON "PublishedPost"("organizationId", "engagement" DESC);

-- CreateIndex
CREATE INDEX "PublishedPost_publishedAt_idx" ON "PublishedPost"("publishedAt");

-- CreateIndex
CREATE INDEX "Draft_organizationId_idx" ON "Draft"("organizationId");

-- CreateIndex
CREATE INDEX "Draft_brandId_idx" ON "Draft"("brandId");

-- CreateIndex
CREATE INDEX "Draft_batchId_idx" ON "Draft"("batchId");

-- CreateIndex
CREATE INDEX "Draft_organizationId_status_idx" ON "Draft"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Draft_repurposedFromId_idx" ON "Draft"("repurposedFromId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBatch_createdByUserId_key" ON "ContentBatch"("createdByUserId");

-- CreateIndex
CREATE INDEX "ContentBatch_organizationId_idx" ON "ContentBatch"("organizationId");

-- CreateIndex
CREATE INDEX "ContentBatch_brandId_idx" ON "ContentBatch"("brandId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_brandId_idx" ON "Notification"("brandId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_type_idx" ON "Notification"("organizationId", "type");

-- CreateIndex
CREATE INDEX "ConnectedAccount_organizationId_idx" ON "ConnectedAccount"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_organizationId_platform_externalId_key" ON "ConnectedAccount"("organizationId", "platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "unified_studio_profiles_userId_key" ON "unified_studio_profiles"("userId");

-- CreateIndex
CREATE INDEX "unified_studio_profiles_userId_idx" ON "unified_studio_profiles"("userId");

-- CreateIndex
CREATE INDEX "unified_user_missions_profileId_idx" ON "unified_user_missions"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "unified_user_missions_profileId_missionKey_key" ON "unified_user_missions"("profileId", "missionKey");

-- CreateIndex
CREATE INDEX "unified_user_achievements_profileId_idx" ON "unified_user_achievements"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "unified_user_achievements_profileId_achievementKey_key" ON "unified_user_achievements"("profileId", "achievementKey");

-- CreateIndex
CREATE INDEX "unified_studio_drafts_profileId_idx" ON "unified_studio_drafts"("profileId");

-- CreateIndex
CREATE INDEX "unified_studio_drafts_profileId_status_idx" ON "unified_studio_drafts"("profileId", "status");

-- CreateIndex
CREATE INDEX "unified_conversation_sessions_profileId_idx" ON "unified_conversation_sessions"("profileId");

-- CreateIndex
CREATE INDEX "unified_conversation_messages_sessionId_idx" ON "unified_conversation_messages"("sessionId");

-- CreateIndex
CREATE INDEX "unified_studio_notifications_profileId_idx" ON "unified_studio_notifications"("profileId");

-- CreateIndex
CREATE INDEX "unified_studio_notifications_profileId_read_idx" ON "unified_studio_notifications"("profileId", "read");

-- CreateIndex
CREATE INDEX "unified_analytics_events_profileId_idx" ON "unified_analytics_events"("profileId");

-- CreateIndex
CREATE INDEX "unified_analytics_events_eventName_idx" ON "unified_analytics_events"("eventName");

-- CreateIndex
CREATE INDEX "unified_analytics_events_timestamp_idx" ON "unified_analytics_events"("timestamp");

-- CreateIndex
CREATE INDEX "unified_assets_profileId_idx" ON "unified_assets"("profileId");

-- CreateIndex
CREATE INDEX "unified_assets_usageType_idx" ON "unified_assets"("usageType");

-- CreateIndex
CREATE UNIQUE INDEX "unified_payments_stripePaymentIntentId_key" ON "unified_payments"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "unified_payments_profileId_idx" ON "unified_payments"("profileId");

-- CreateIndex
CREATE INDEX "unified_payments_status_idx" ON "unified_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unified_subscriptions_profileId_key" ON "unified_subscriptions"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "unified_subscriptions_stripeCustomerId_key" ON "unified_subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "unified_subscriptions_stripeSubscriptionId_key" ON "unified_subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "unified_subscriptions_plan_idx" ON "unified_subscriptions"("plan");

-- CreateIndex
CREATE INDEX "unified_subscriptions_status_idx" ON "unified_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unified_invoices_stripeInvoiceId_key" ON "unified_invoices"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "unified_invoices_profileId_idx" ON "unified_invoices"("profileId");

-- CreateIndex
CREATE INDEX "unified_invoices_status_idx" ON "unified_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unified_referrals_referredUserId_key" ON "unified_referrals"("referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "unified_referrals_referralCode_key" ON "unified_referrals"("referralCode");

-- CreateIndex
CREATE INDEX "unified_referrals_referrerUserId_idx" ON "unified_referrals"("referrerUserId");

-- CreateIndex
CREATE INDEX "unified_referrals_referralCode_idx" ON "unified_referrals"("referralCode");

-- CreateIndex
CREATE INDEX "unified_retention_campaigns_profileId_idx" ON "unified_retention_campaigns"("profileId");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLedger" ADD CONSTRAINT "AiUsageLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedPost" ADD CONSTRAINT "PublishedPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedPost" ADD CONSTRAINT "PublishedPost_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ContentBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_repurposedFromId_fkey" FOREIGN KEY ("repurposedFromId") REFERENCES "PublishedPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBatch" ADD CONSTRAINT "ContentBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBatch" ADD CONSTRAINT "ContentBatch_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBatch" ADD CONSTRAINT "ContentBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_studio_profiles" ADD CONSTRAINT "unified_studio_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_user_missions" ADD CONSTRAINT "unified_user_missions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_user_achievements" ADD CONSTRAINT "unified_user_achievements_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_studio_drafts" ADD CONSTRAINT "unified_studio_drafts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_conversation_sessions" ADD CONSTRAINT "unified_conversation_sessions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_conversation_messages" ADD CONSTRAINT "unified_conversation_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "unified_conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_studio_notifications" ADD CONSTRAINT "unified_studio_notifications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_analytics_events" ADD CONSTRAINT "unified_analytics_events_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_assets" ADD CONSTRAINT "unified_assets_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_payments" ADD CONSTRAINT "unified_payments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_subscriptions" ADD CONSTRAINT "unified_subscriptions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_invoices" ADD CONSTRAINT "unified_invoices_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_referrals" ADD CONSTRAINT "unified_referrals_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_referrals" ADD CONSTRAINT "unified_referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_retention_campaigns" ADD CONSTRAINT "unified_retention_campaigns_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "unified_studio_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

