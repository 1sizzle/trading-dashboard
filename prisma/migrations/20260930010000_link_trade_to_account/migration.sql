-- Replace the coarse LIVE/EVAL/FUNDED bucket with a real link to TradingAccount
-- (the Accounts tab), so a trade can be logged against one or more real named
-- accounts instead of a generic category.
ALTER TABLE "Trade" DROP COLUMN "account";
DROP TYPE "TradeAccount";

ALTER TABLE "Trade" ADD COLUMN "accountId" TEXT;
ALTER TABLE "Trade" ADD COLUMN "accountName" TEXT;

CREATE INDEX "Trade_accountId_idx" ON "Trade"("accountId");

ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
