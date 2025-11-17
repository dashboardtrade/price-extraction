-- Create candle_data table in Supabase
CREATE TABLE IF NOT EXISTS candle_data (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    symbol VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT',
    source VARCHAR(20) NOT NULL DEFAULT 'binance',
    timeframes JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_candle_data_timestamp ON candle_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_candle_data_symbol ON candle_data(symbol);

-- Example of timeframes JSONB structure:
-- {
--   "4H": [{"time": 1700000000, "open": 95000, "high": 95500, "low": 94500, "close": 95200, "volume": 1000}],
--   "1H": [...],
--   "15min": [...],
--   "1min": [...]
-- }
