-- CreateTable
CREATE TABLE "MissedSetup" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "setupDescription" TEXT NOT NULL,
    "reasonSkipped" TEXT NOT NULL,
    "notes" TEXT,
    "seenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissedSetup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissedSetup_seenAt_idx" ON "MissedSetup"("seenAt");
