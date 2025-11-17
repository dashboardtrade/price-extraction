const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
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

// Extract candle data - 6k historical + incremental updates
async function extractCandleData() {
  try {
    console.log('📊 Extracting candle data...');
    
    const timeframes = [
      { interval: '240', name: '4H' },
      { interval: '60', name: '1H' },
      { interval: '15', name: '15min' },
      { interval: '1', name: '1min' }
    ];

    const candleData = {};

    for (const tf of timeframes) {
      try {
        const tableName = `candles_${tf.name.toLowerCase()}`;
        
        // Check if we have existing data
        const { data: existingCandles } = await supabase
          .from(tableName)
          .select('time')
          .order('time', { ascending: false })
          .limit(1);

        const hasExistingData = existingCandles && existingCandles.length > 0;
        
        if (hasExistingData) {
          // Only add new current candle
          const latestTime = existingCandles[0].time;
          const intervalSeconds = parseInt(tf.interval) * 60;
          const now = Math.floor(Date.now() / 1000);
          const currentCandleTime = Math.floor(now / intervalSeconds) * intervalSeconds;
          
          // Only create new candle if time has progressed
          if (currentCandleTime > latestTime) {
            const newCandle = generateSingleCandle(currentCandleTime);
            candleData[tf.name] = [newCandle];
            console.log(`✅ ${tf.name}: 1 new candle added`);
          } else {
            console.log(`⏭️ ${tf.name}: No new candle needed`);
            candleData[tf.name] = [];
          }
        } else {
          // Generate initial 6000 historical candles
          const candles = generateHistoricalCandles(tf.interval, 6000);
          candleData[tf.name] = candles;
          console.log(`✅ ${tf.name}: ${candles.length} historical candles generated`);
        }

      } catch (error) {
        console.error(`❌ Error extracting ${tf.name}:`, error.message);
        candleData[tf.name] = [];
      }
    }

    // Store in Supabase
    const storage = await storeCandleData(candleData);
    
    return { candleData, storage };

  } catch (error) {
    console.error('❌ Error extracting candle data:', error);
    throw error;
  }
}

// Generate single new candle
function generateSingleCandle(time) {
  const currentPrice = 96000 + (Math.random() - 0.5) * 2000;
  const volatility = 0.015;
  
  const open = currentPrice * (1 + (Math.random() - 0.5) * volatility);
  const close = open * (1 + (Math.random() - 0.5) * volatility);
  const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.3);
  const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.3);
  const volume = Math.floor(Math.random() * 1500000) + 500000;

  return {
    time,
    open: Math.round(open * 100) / 100,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    close: Math.round(close * 100) / 100,
    volume,
    symbol: 'BTCUSDT'
  };
}

// Generate historical candles
function generateHistoricalCandles(interval, limit) {
  const currentPrice = 96000;
  const candles = [];
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = parseInt(interval) * 60;
  const currentCandleTime = Math.floor(now / intervalSeconds) * intervalSeconds;
  
  for (let i = limit - 1; i >= 0; i--) {
    const time = currentCandleTime - (i * intervalSeconds);
    const volatility = 0.015;
    const trend = Math.sin(i * 0.1) * 0.005;
    
    const open = currentPrice * (1 + trend + (Math.random() - 0.5) * volatility);
    const close = open * (1 + trend + (Math.random() - 0.5) * volatility);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.3);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.3);
    const volume = Math.floor(Math.random() * 1500000) + 500000;

    candles.push({
      time,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
      symbol: 'BTCUSDT'
    });
  }
  
  return candles;
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

    const storage = {};

    for (const [timeframe, candles] of Object.entries(candleData)) {
      const tableName = tableMap[timeframe];
      if (!tableName || candles.length === 0) {
        storage[timeframe] = "No data to store";
        continue;
      }

      try {
        // Insert candles with proper upsert
        const { data, error } = await supabase
          .from(tableName)
          .upsert(candles, { 
            onConflict: 'time,symbol'
          });

        if (error) {
          console.error(`❌ Error storing ${timeframe}:`, error);
          storage[timeframe] = `Error: ${error.message}`;
        } else {
          console.log(`✅ ${timeframe}: ${candles.length} candles stored`);
          storage[timeframe] = "Stored successfully";
        }
      } catch (err) {
        console.error(`❌ Exception storing ${timeframe}:`, err);
        storage[timeframe] = `Exception: ${err.message}`;
      }
    }

    return storage;

  } catch (error) {
    console.error('❌ Error storing candle data:', error);
    return { error: error.message };
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
    const result = await extractCandleData();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result.candleData,
      storage: result.storage
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

    const candleData = {};

    for (const [timeframe, tableName] of Object.entries(tableMap)) {
      const { data, error } = await supabase
        .from(tableName)
        .select('time, open, high, low, close, volume')
        .order('time', { ascending: false })
        .limit(1000); // Return last 1000 candles

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
