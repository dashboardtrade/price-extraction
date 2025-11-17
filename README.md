# Price Extraction Server

Dedicated server for extracting Bitcoin candle data from Binance API and storing in Supabase.

## Features

- **Multi-timeframe extraction**: 4H, 1H, 15min, 1min candles
- **Real-time data**: Updates every minute
- **Supabase storage**: Stores data in structured JSONB format
- **Railway deployment**: Ready for Railway hosting

## Setup

1. **Supabase Setup**:
   ```sql
   -- Run schema.sql in your Supabase SQL editor
   ```

2. **Environment Variables**:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

3. **Deploy to Railway**:
   - Connect this GitHub repo to Railway
   - Set environment variables
   - Deploy automatically

## API Endpoints

- `GET /` - Server info
- `GET /health` - Health check
- `GET /extract` - Manual extraction
- `GET /latest` - Get latest candle data

## Data Structure

```json
{
  "4H": [{"time": 1700000000, "open": 95000, "high": 95500, "low": 94500, "close": 95200, "volume": 1000}],
  "1H": [...],
  "15min": [...],
  "1min": [...]
}
```

## Usage

The server automatically extracts candle data every minute and stores it in Supabase. Your trading bot can access the latest data via the `/latest` endpoint.
