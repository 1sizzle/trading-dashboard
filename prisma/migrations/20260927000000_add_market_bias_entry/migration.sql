CREATE TYPE "BiasSession" AS ENUM ('ASIA', 'LONDON', 'NEW_YORK');
CREATE TYPE "BiasDirection" AS ENUM ('BULLISH', 'BEARISH', 'NEUTRAL');

CREATE TABLE "MarketBiasEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "session" "BiasSession" NOT NULL,
    "bias" "BiasDirection" NOT NULL,
    "points" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketBiasEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketBiasEntry_date_session_key" ON "MarketBiasEntry"("date", "session");
CREATE INDEX "MarketBiasEntry_date_idx" ON "MarketBiasEntry"("date");
