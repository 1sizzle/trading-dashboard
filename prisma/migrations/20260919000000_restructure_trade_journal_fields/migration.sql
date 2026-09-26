-- Add NY AM/PM session split (NEW_YORK kept as a legacy, no-longer-produced value)
ALTER TYPE "TradingSession" ADD VALUE IF NOT EXISTS 'NEW_YORK_AM';
ALTER TYPE "TradingSession" ADD VALUE IF NOT EXISTS 'NEW_YORK_PM';

-- CreateEnum
CREATE TYPE "TradeAccount" AS ENUM ('LIVE', 'EVAL', 'FUNDED');

-- CreateEnum
CREATE TYPE "TradeOutcome" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN');

-- AlterTable: symbol/exitTime/durationMinutes become optional (manual-entry
-- form no longer collects an instrument or a separate exit time), account
-- and outcome are added.
ALTER TABLE "Trade" ALTER COLUMN "symbol" DROP NOT NULL;
ALTER TABLE "Trade" ALTER COLUMN "exitTime" DROP NOT NULL;
ALTER TABLE "Trade" ALTER COLUMN "durationMinutes" DROP NOT NULL;
ALTER TABLE "Trade" ADD COLUMN "account" "TradeAccount" NOT NULL DEFAULT 'LIVE';
ALTER TABLE "Trade" ADD COLUMN "outcome" "TradeOutcome";
