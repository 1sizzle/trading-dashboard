-- Daily/weekly reviews (never had a migration of their own), the Claude mentor's
-- fields on them and on the premarket checklist, and its pattern memory.
-- Written with IF NOT EXISTS so it can be pasted into a database that already has
-- some of these from an earlier `db push`.

CREATE TABLE IF NOT EXISTS "DailyReview" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reflection" TEXT,
    "aiCommentary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyReview_date_key" ON "DailyReview"("date");

CREATE TABLE IF NOT EXISTS "WeeklyReview" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "reflection" TEXT,
    "aiCommentary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyReview_weekStart_key" ON "WeeklyReview"("weekStart");

ALTER TABLE "DailyReview" ADD COLUMN IF NOT EXISTS "mentorReview" TEXT;
ALTER TABLE "WeeklyReview" ADD COLUMN IF NOT EXISTS "mentorReview" TEXT;
ALTER TABLE "PremarketChecklist" ADD COLUMN IF NOT EXISTS "mentorPlan" TEXT;

CREATE TABLE IF NOT EXISTS "MentorMemory" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorMemory_pkey" PRIMARY KEY ("id")
);
