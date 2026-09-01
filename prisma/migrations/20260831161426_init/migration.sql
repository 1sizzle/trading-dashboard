-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('FUTURES_METALS', 'CRYPTO');

-- CreateEnum
CREATE TYPE "TradingSession" AS ENUM ('ASIA', 'LONDON', 'NEW_YORK', 'OTHER');

-- CreateEnum
CREATE TYPE "TradeSource" AS ENUM ('MANUAL', 'CSV_IMPORT');

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "entryPrice" DECIMAL(65,30),
    "exitPrice" DECIMAL(65,30),
    "positionSize" DECIMAL(65,30),
    "stopLoss" DECIMAL(65,30),
    "riskDollars" DECIMAL(65,30),
    "entryTime" TIMESTAMP(3) NOT NULL,
    "exitTime" TIMESTAMP(3) NOT NULL,
    "pnl" DECIMAL(65,30) NOT NULL,
    "rMultiple" DECIMAL(65,30),
    "durationMinutes" INTEGER NOT NULL,
    "session" "TradingSession" NOT NULL,
    "source" "TradeSource" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeTag" (
    "tradeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TradeTag_pkey" PRIMARY KEY ("tradeId","tagId")
);

-- CreateTable
CREATE TABLE "PsychologyEntry" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "preEmotion" TEXT NOT NULL,
    "postEmotion" TEXT,
    "notes" TEXT,

    CONSTRAINT "PsychologyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookRule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "setupGrade" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremarketChecklist" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bias" TEXT NOT NULL,
    "keyLevels" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremarketChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskSettings" (
    "id" TEXT NOT NULL,
    "accountSize" DECIMAL(65,30) NOT NULL,
    "dailyLossLimit" DECIMAL(65,30) NOT NULL,
    "maxRiskPerTrade" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalLogEntry" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawText" TEXT NOT NULL,
    "symbol" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "SignalLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trade_externalId_key" ON "Trade"("externalId");

-- CreateIndex
CREATE INDEX "Trade_entryTime_idx" ON "Trade"("entryTime");

-- CreateIndex
CREATE INDEX "Trade_session_idx" ON "Trade"("session");

-- CreateIndex
CREATE INDEX "Trade_assetClass_idx" ON "Trade"("assetClass");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PsychologyEntry_tradeId_key" ON "PsychologyEntry"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "PremarketChecklist_date_key" ON "PremarketChecklist"("date");

-- AddForeignKey
ALTER TABLE "TradeTag" ADD CONSTRAINT "TradeTag_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeTag" ADD CONSTRAINT "TradeTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologyEntry" ADD CONSTRAINT "PsychologyEntry_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
