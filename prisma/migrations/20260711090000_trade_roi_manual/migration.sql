-- Manually-entered ROI % for backtests (null => computed from pnl / balance).
ALTER TABLE "Trade" ADD COLUMN "roiManual" DECIMAL(10,2);
