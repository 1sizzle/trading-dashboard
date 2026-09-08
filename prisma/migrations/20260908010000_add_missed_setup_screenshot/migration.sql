-- CreateTable
CREATE TABLE "MissedSetupScreenshot" (
    "id" TEXT NOT NULL,
    "missedSetupId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissedSetupScreenshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MissedSetupScreenshot" ADD CONSTRAINT "MissedSetupScreenshot_missedSetupId_fkey" FOREIGN KEY ("missedSetupId") REFERENCES "MissedSetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
