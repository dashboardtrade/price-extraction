-- Create separate tables for each timeframe
CREATE TABLE IF NOT EXISTS candles_4h (
    id BIGSERIAL PRIMARY KEY,
    time BIGINT NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    symbol VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(time, symbol)
);

CREATE TABLE IF NOT EXISTS candles_1h (
    id BIGSERIAL PRIMARY KEY,
    time BIGINT NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    symbol VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(time, symbol)
);

CREATE TABLE IF NOT EXISTS candles_15min (
    id BIGSERIAL PRIMARY KEY,
    time BIGINT NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    symbol VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(time, symbol)
);

CREATE TABLE IF NOT EXISTS candles_1min (
    id BIGSERIAL PRIMARY KEY,
    time BIGINT NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    symbol VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(time, symbol)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_candles_4h_time ON candles_4h(time DESC);
CREATE INDEX IF NOT EXISTS idx_candles_1h_time ON candles_1h(time DESC);
CREATE INDEX IF NOT EXISTS idx_candles_15min_time ON candles_15min(time DESC);
CREATE INDEX IF NOT EXISTS idx_candles_1min_time ON candles_1min(time DESC);
