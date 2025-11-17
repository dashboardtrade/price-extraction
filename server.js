const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function generateCandles() {
  const timeframes = [
    { name: '4H', interval: 240, limit: 100, table: 'candles_4h' },
    { name: '1H', interval: 60, limit: 168, table: 'candles_1h' },
    { name: '15min', interval: 15, limit: 96, table: 'candles_15min' },
    { name: '1min', interval: 1, limit: 100, table: 'candles_1min' }
  ];

  const results = {};

  for (const tf of timeframes) {
    const candles = [];
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = tf.interval * 60;
    const currentTime = Math.floor(now / intervalSeconds) * intervalSeconds;

    for (let i = tf.limit - 1; i >= 0; i--) {
      const time = currentTime - (i * intervalSeconds);
      const price = 96000 + (Math.random() - 0.5) * 1000;
      const volatility = 0.01;
      
      const open = price * (1 + (Math.random() - 0.5) * volatility);
      const close = open * (1 + (Math.random() - 0.5) * volatility);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = Math.floor(Math.random() * 1000000) + 500000;

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

    // Store in Supabase
    const { error } = await supabase
      .from(tf.table)
      .upsert(candles, { onConflict: 'time,symbol' });

    if (error) {
      results[tf.name] = `Error: ${error.message}`;
    } else {
      results[tf.name] = `${candles.length} candles stored`;
    }
  }

  return results;
}

app.get('/extract', async (req, res) => {
  try {
    const results = await generateCandles();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storage: results
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
    const tables = {
      '4H': 'candles_4h',
      '1H': 'candles_1h',
      '15min': 'candles_15min',
      '1min': 'candles_1min'
    };

    const data = {};

    for (const [timeframe, table] of Object.entries(tables)) {
      const { data: candles } = await supabase
        .from(table)
        .select('*')
        .order('time', { ascending: true });
      
      data[timeframe] = candles || [];
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Price Extraction Server',
    endpoints: ['/extract', '/latest']
  });
});

// Auto-update every minute
setInterval(async () => {
  try {
    await generateCandles();
  } catch (error) {
    console.error('Auto-update error:', error);
  }
}, 60000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  generateCandles(); // Initial run
});
