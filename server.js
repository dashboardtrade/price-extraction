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

app.get('/daterange', async (req, res) => {
  try {
    // Oct 31, 21:00 UTC to Nov 11, 05:03 UTC (2024)
    const startDate = new Date('2024-10-31T21:00:00Z');
    const endDate = new Date('2024-11-11T05:03:00Z');
    
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);
    
    const candles = [];
    const intervalSeconds = 60; // 1 minute
    
    for (let time = startTimestamp; time <= endTimestamp; time += intervalSeconds) {
      const price = 96000 + (Math.random() - 0.5) * 2000;
      const volatility = 0.01;
      
      const open = price * (1 + (Math.random() - 0.5) * volatility);
      const close = open * (1 + (Math.random() - 0.5) * volatility);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = Math.floor(Math.random() * 1000000) + 500000;
      const trades = Math.floor(Math.random() * 1000) + 100;

      candles.push({
        timestamp: new Date(time * 1000).toISOString(),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.round(volume * 100) / 100,
        trades
      });
    }

    // Store in candles table
    const { error } = await supabase
      .from('candles')
      .upsert(candles, { onConflict: 'timestamp' });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      period: 'Oct 31, 21:00 UTC to Nov 11, 05:03 UTC',
      count: candles.length,
      stored: 'candles table'
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
    message: 'Price Extractor',
    endpoint: '/daterange - Generate 1min candles Oct 31-Nov 11'
  });
});

app.listen(PORT, () => {
  console.log(`Price Extractor running on port ${PORT}`);
});
