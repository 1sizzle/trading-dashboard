-- CreateTable
CREATE TABLE "TimetableBlock" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "days" INTEGER[],
    "date" DATE,
    "color" TEXT NOT NULL DEFAULT 'violet',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimetableBlock_date_idx" ON "TimetableBlock"("date");
