-- CreateEnum
CREATE TYPE "EtsyProductStatus" AS ENUM ('WORKING', 'REVIEW', 'READY', 'LISTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EtsyArtworkRole" AS ENUM ('ORIGINAL', 'MOCKUP', 'SIZE_GUIDE');

-- CreateEnum
CREATE TYPE "EtsyAnalyticsSource" AS ENUM ('MANUAL', 'SYNCED');

-- CreateTable
CREATE TABLE "EtsySettings" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "fulfillmentProvider" TEXT,
    "skuDigits" INTEGER NOT NULL DEFAULT 3,
    "skuCounter" INTEGER NOT NULL DEFAULT 0,
    "artworkRatios" TEXT[] DEFAULT ARRAY['2:3', '5:6']::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyPromptWorkspace" (
    "id" TEXT NOT NULL,
    "collectionRequest" TEXT NOT NULL,
    "requestedCount" INTEGER NOT NULL DEFAULT 1,
    "researchDate" TIMESTAMP(3),
    "researchSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyPromptWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyPrompt" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "sourceLinks" JSONB,
    "evidenceSignals" JSONB,
    "confidence" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyProduct" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "EtsyProductStatus" NOT NULL DEFAULT 'WORKING',
    "etsyListingId" TEXT,
    "etsyListingUrl" TEXT,
    "listedAt" TIMESTAMP(3),
    "promptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyListingDraft" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "suggestedCategory" TEXT,
    "suggestedMaterials" TEXT,
    "altText" TEXT,
    "aiDisclosure" TEXT,
    "pricingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyListingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyArtworkAsset" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "role" "EtsyArtworkRole" NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyArtworkAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyKeyword" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "niche" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyBundle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestedPrice" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyBundleProduct" (
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "EtsyBundleProduct_pkey" PRIMARY KEY ("bundleId","productId")
);

-- CreateTable
CREATE TABLE "EtsyAnalyticsRecord" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "favourites" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "source" "EtsyAnalyticsSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyAnalyticsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyOpportunityScan" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "resultsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyOpportunityScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyConnection" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "EtsyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EtsyProduct_sku_key" ON "EtsyProduct"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyProduct_promptId_key" ON "EtsyProduct"("promptId");

-- CreateIndex
CREATE INDEX "EtsyProduct_status_idx" ON "EtsyProduct"("status");

-- CreateIndex
CREATE INDEX "EtsyPrompt_workspaceId_idx" ON "EtsyPrompt"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyListingDraft_productId_key" ON "EtsyListingDraft"("productId");

-- CreateIndex
CREATE INDEX "EtsyArtworkAsset_productId_idx" ON "EtsyArtworkAsset"("productId");

-- CreateIndex
CREATE INDEX "EtsyArtworkAsset_sku_idx" ON "EtsyArtworkAsset"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyKeyword_term_key" ON "EtsyKeyword"("term");

-- CreateIndex
CREATE INDEX "EtsyAnalyticsRecord_date_idx" ON "EtsyAnalyticsRecord"("date");

-- CreateIndex
CREATE INDEX "EtsyAnalyticsRecord_productId_idx" ON "EtsyAnalyticsRecord"("productId");

-- AddForeignKey
ALTER TABLE "EtsyPrompt" ADD CONSTRAINT "EtsyPrompt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "EtsyPromptWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyProduct" ADD CONSTRAINT "EtsyProduct_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "EtsyPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingDraft" ADD CONSTRAINT "EtsyListingDraft_productId_fkey" FOREIGN KEY ("productId") REFERENCES "EtsyProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyArtworkAsset" ADD CONSTRAINT "EtsyArtworkAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "EtsyProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyBundleProduct" ADD CONSTRAINT "EtsyBundleProduct_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "EtsyBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyAnalyticsRecord" ADD CONSTRAINT "EtsyAnalyticsRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "EtsyProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
