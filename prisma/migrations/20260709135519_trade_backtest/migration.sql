-- AlterTable: mark manually-logged backtest trades
ALTER TABLE "Trade" ADD COLUMN "isBacktest" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Trade_accountId_isBacktest_idx" ON "Trade"("accountId", "isBacktest");
