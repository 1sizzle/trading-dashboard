CREATE TABLE "TaxSettings" (
    "id" TEXT NOT NULL,
    "overrideRatePct" DECIMAL(65,30),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TaxSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxPayout" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,
    "accountName" TEXT NOT NULL,
    "grossAmount" DECIMAL(65,30) NOT NULL,
    "setAsidePct" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaxPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxIncomeEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaxIncomeEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxExpenseEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaxExpenseEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxReceipt" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaxReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaxPayout_date_idx" ON "TaxPayout"("date");
CREATE INDEX "TaxIncomeEntry_date_idx" ON "TaxIncomeEntry"("date");
CREATE INDEX "TaxExpenseEntry_date_idx" ON "TaxExpenseEntry"("date");
CREATE INDEX "TaxReceipt_date_idx" ON "TaxReceipt"("date");

ALTER TABLE "TaxPayout" ADD CONSTRAINT "TaxPayout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxReceipt" ADD CONSTRAINT "TaxReceipt_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "TaxExpenseEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
