CREATE TYPE "NewsImpact" AS ENUM ('HIGH', 'MEDIUM');

CREATE TABLE "NewsEvent" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "impact" "NewsImpact" NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "forecast" TEXT,
    "previous" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsEvent_externalKey_key" ON "NewsEvent"("externalKey");
CREATE INDEX "NewsEvent_eventTime_idx" ON "NewsEvent"("eventTime");
