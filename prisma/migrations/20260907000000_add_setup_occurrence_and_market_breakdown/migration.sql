-- AlterTable
ALTER TABLE "PlaybookRule" ADD COLUMN "strategyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PlaybookRule_strategyKey_key" ON "PlaybookRule"("strategyKey");

-- CreateEnum
CREATE TYPE "SetupOccurrenceStatus" AS ENUM ('PENDING', 'WIN', 'LOSS', 'BREAKEVEN');

-- CreateEnum
CREATE TYPE "SetupOccurrenceSource" AS ENUM ('WEBHOOK', 'CSV_IMPORT');

-- CreateTable
CREATE TABLE "SetupOccurrence" (
    "id" TEXT NOT NULL,
    "playbookRuleId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT 'NQ',
    "direction" "TradeDirection" NOT NULL,
    "status" "SetupOccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "entryPrice" DECIMAL(65,30) NOT NULL,
    "exitPrice" DECIMAL(65,30),
    "stopPrice" DECIMAL(65,30),
    "targetPrice" DECIMAL(65,30),
    "contracts" INTEGER NOT NULL DEFAULT 1,
    "pnlPoints" DECIMAL(65,30),
    "pnlDollars" DECIMAL(65,30),
    "entryTime" TIMESTAMP(3) NOT NULL,
    "exitTime" TIMESTAMP(3),
    "source" "SetupOccurrenceSource" NOT NULL,
    "externalId" TEXT,
    "entryRawPayload" JSONB,
    "exitRawPayload" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetupOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetupOccurrence_externalId_key" ON "SetupOccurrence"("externalId");

-- CreateIndex
CREATE INDEX "SetupOccurrence_playbookRuleId_entryTime_idx" ON "SetupOccurrence"("playbookRuleId", "entryTime");

-- CreateIndex
CREATE INDEX "SetupOccurrence_entryTime_idx" ON "SetupOccurrence"("entryTime");

-- CreateIndex
CREATE INDEX "SetupOccurrence_status_idx" ON "SetupOccurrence"("status");

-- AddForeignKey
ALTER TABLE "SetupOccurrence" ADD CONSTRAINT "SetupOccurrence_playbookRuleId_fkey" FOREIGN KEY ("playbookRuleId") REFERENCES "PlaybookRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "MarketBreakdownPostType" AS ENUM ('NY_OPEN', 'FIRST_HOUR', 'MIDDAY', 'DAILY_RECAP');

-- CreateTable
CREATE TABLE "MarketBreakdownPost" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT 'NQ',
    "postType" "MarketBreakdownPostType" NOT NULL,
    "tradingDate" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "vix" DECIMAL(65,30),
    "sessionVolumePct" DECIMAL(65,30),
    "ibHigh" DECIMAL(65,30),
    "ibLow" DECIMAL(65,30),
    "keyLevelsData" JSONB NOT NULL,
    "structureData" JSONB,
    "valueAreaData" JSONB,
    "historicalStatsData" JSONB,
    "narrative" JSONB,
    "rawPayload" JSONB NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketBreakdownPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketBreakdownPost_externalId_key" ON "MarketBreakdownPost"("externalId");

-- CreateIndex
CREATE INDEX "MarketBreakdownPost_tradingDate_postType_idx" ON "MarketBreakdownPost"("tradingDate", "postType");
