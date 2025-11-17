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

// Store candle data in Supabase
async function storeCandleData(candleData) {
  try {
    const timestamp = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('candle_data')
      .insert({
        timestamp,
        timeframes: candleData,
        symbol: 'BTCUSDT',
        source: 'binance'
      });

    if (error) {
      console.error('❌ Supabase error:', error);
    } else {
      console.log('✅ Candle data stored in Supabase');
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
    const { data, error } = await supabase
      .from('candle_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data[0] || null
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
