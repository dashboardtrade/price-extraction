const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client for storing candle data
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Binance API for real candle data
const BINANCE_API = 'https://api.binance.com/api/v3/klines';

// Extract candle data from Binance
async function extractCandleData() {
  try {
    console.log('📊 Extracting candle data from Binance...');
    
    const timeframes = [
      { interval: '4h', limit: 100, name: '4H' },
      { interval: '1h', limit: 168, name: '1H' },
      { interval: '15m', limit: 200, name: '15min' },
      { interval: '1m', limit: 1440, name: '1min' }
    ];

    const candleData = {};

    for (const tf of timeframes) {
      try {
        const response = await axios.get(BINANCE_API, {
          params: {
            symbol: 'BTCUSDT',
            interval: tf.interval,
            limit: tf.limit
          }
        });

        const candles = response.data.map(candle => ({
          time: Math.floor(candle[0] / 1000),
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        }));

        candleData[tf.name] = candles;
        console.log(`✅ ${tf.name}: ${candles.length} candles`);

      } catch (error) {
        console.error(`❌ Error extracting ${tf.name}:`, error.message);
      }
    }

    // Store in Supabase
    await storeCandleData(candleData);
    
    return candleData;

  } catch (error) {
    console.error('❌ Error extracting candle data:', error);
    throw error;
  }
}

// Store candle data in separate Supabase tables
async function storeCandleData(candleData) {
  try {
    const tableMap = {
      '4H': 'candles_4h',
      '1H': 'candles_1h', 
      '15min': 'candles_15min',
      '1min': 'candles_1min'
    };

    for (const [timeframe, candles] of Object.entries(candleData)) {
      const tableName = tableMap[timeframe];
      if (!tableName) continue;

      // Insert candles with upsert to avoid duplicates
      const { data, error } = await supabase
        .from(tableName)
        .upsert(candles, { 
          onConflict: 'time,symbol',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error(`❌ Error storing ${timeframe}:`, error);
      } else {
        console.log(`✅ ${timeframe}: ${candles.length} candles stored`);
      }
    }

  } catch (error) {
    console.error('❌ Error storing candle data:', error);
  }
}

// API Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Price Extraction Server',
    status: 'running',
    endpoints: ['/extract', '/latest', '/health']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/extract', async (req, res) => {
  try {
    const candleData = await extractCandleData();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: candleData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/latest', async (req, res) => {
  try {
    const tableMap = {
      '4H': 'candles_4h',
      '1H': 'candles_1h',
      '15min': 'candles_15min', 
      '1min': 'candles_1min'
    };

    const limits = {
      '4H': 100,
      '1H': 168,
      '15min': 200,
      '1min': 1440
    };

    const candleData = {};

    for (const [timeframe, tableName] of Object.entries(tableMap)) {
      const { data, error } = await supabase
        .from(tableName)
        .select('time, open, high, low, close, volume')
        .order('time', { ascending: false })
        .limit(limits[timeframe]);

      if (error) {
        console.error(`❌ Error fetching ${timeframe}:`, error);
        candleData[timeframe] = [];
      } else {
        candleData[timeframe] = data.reverse(); // Reverse to get chronological order
      }
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: candleData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auto-extract every minute
setInterval(async () => {
  try {
    await extractCandleData();
  } catch (error) {
    console.error('❌ Auto-extraction error:', error);
  }
}, 60000);

app.listen(PORT, () => {
  console.log(`🚀 Price Extraction Server running on port ${PORT}`);
  console.log('📊 Auto-extracting candle data every minute...');
  
  // Initial extraction
  extractCandleData();
});
