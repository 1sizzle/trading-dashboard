CREATE TYPE "AccountType" AS ENUM ('PROP_FIRM', 'LIVE', 'DEMO');
CREATE TYPE "AccountStatus" AS ENUM ('EVALUATION', 'FUNDED', 'FAILED', 'CLOSED');

CREATE TABLE "TradingAccountGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradingAccountGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradingAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'PROP_FIRM',
    "status" "AccountStatus" NOT NULL DEFAULT 'EVALUATION',
    "firm" TEXT,
    "groupId" TEXT,
    "accountSize" DECIMAL(65,30) NOT NULL,
    "startingBalance" DECIMAL(65,30) NOT NULL,
    "currentBalance" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TradingAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TradingAccountGroup_name_key" ON "TradingAccountGroup"("name");
CREATE INDEX "TradingAccount_status_idx" ON "TradingAccount"("status");

ALTER TABLE "TradingAccount" ADD CONSTRAINT "TradingAccount_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TradingAccountGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
