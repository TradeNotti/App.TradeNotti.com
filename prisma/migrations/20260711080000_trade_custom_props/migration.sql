-- User-defined trade properties (mainly for backtests): array of { id, name, value }.
ALTER TABLE "Trade" ADD COLUMN "customProps" JSONB;
