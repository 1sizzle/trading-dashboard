CREATE TABLE "MentorNote" (
    "id" TEXT NOT NULL,
    "note" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorNoteScreenshot" (
    "id" TEXT NOT NULL,
    "mentorNoteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorNoteScreenshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MentorNote_postedAt_idx" ON "MentorNote"("postedAt");

ALTER TABLE "MentorNoteScreenshot" ADD CONSTRAINT "MentorNoteScreenshot_mentorNoteId_fkey" FOREIGN KEY ("mentorNoteId") REFERENCES "MentorNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
