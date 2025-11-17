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

async function updateCandles() {
  const timeframes = [
    { name: '4H', interval: 240, limit: 100, table: 'candles_4h' },
    { name: '1H', interval: 60, limit: 168, table: 'candles_1h' },
    { name: '15min', interval: 15, limit: 96, table: 'candles_15min' },
    { name: '1min', interval: 1, limit: 100, table: 'candles_1min' }
  ];

  const results = {};

  for (const tf of timeframes) {
    try {
      // Check existing candles count
      const { count } = await supabase
        .from(tf.table)
        .select('*', { count: 'exact', head: true });

      if (count < tf.limit) {
        // Generate initial candles if not enough
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

        await supabase.from(tf.table).upsert(candles, { onConflict: 'time,symbol' });
        results[tf.name] = `${candles.length} initial candles created`;
      } else {
        // Only add new current candle
        const { data: latest } = await supabase
          .from(tf.table)
          .select('time')
          .order('time', { ascending: false })
          .limit(1);

        const now = Math.floor(Date.now() / 1000);
        const intervalSeconds = tf.interval * 60;
        const currentTime = Math.floor(now / intervalSeconds) * intervalSeconds;

        if (!latest || currentTime > latest[0].time) {
          // Create new candle
          const price = 96000 + (Math.random() - 0.5) * 1000;
          const volatility = 0.01;
          
          const open = price * (1 + (Math.random() - 0.5) * volatility);
          const close = open * (1 + (Math.random() - 0.5) * volatility);
          const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
          const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
          const volume = Math.floor(Math.random() * 1000000) + 500000;

          const newCandle = {
            time: currentTime,
            open: Math.round(open * 100) / 100,
            high: Math.round(high * 100) / 100,
            low: Math.round(low * 100) / 100,
            close: Math.round(close * 100) / 100,
            volume,
            symbol: 'BTCUSDT'
          };

          await supabase.from(tf.table).insert([newCandle]);
          
          // Keep only latest candles (remove old ones)
          const { data: allCandles } = await supabase
            .from(tf.table)
            .select('time')
            .order('time', { ascending: false });

          if (allCandles.length > tf.limit) {
            const oldestToKeep = allCandles[tf.limit - 1].time;
            await supabase
              .from(tf.table)
              .delete()
              .lt('time', oldestToKeep);
          }

          results[tf.name] = '1 new candle added';
        } else {
          results[tf.name] = 'No new candle needed';
        }
      }
    } catch (error) {
      results[tf.name] = `Error: ${error.message}`;
    }
  }

  return results;
}

app.get('/extract', async (req, res) => {
  try {
    const results = await updateCandles();
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

app.get('/range', async (req, res) => {
  try {
    const { from, to, timeframe } = req.query;
    
    if (!from || !to || !timeframe) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameters. Use: /range?from=1234567890&to=1234567890&timeframe=1min'
      });
    }

    const tables = {
      '4H': 'candles_4h',
      '1H': 'candles_1h',
      '15min': 'candles_15min',
      '1min': 'candles_1min'
    };

    const table = tables[timeframe];
    if (!table) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeframe. Use: 4H, 1H, 15min, or 1min'
      });
    }

    const { data: candles } = await supabase
      .from(table)
      .select('*')
      .gte('time', parseInt(from))
      .lte('time', parseInt(to))
      .order('time', { ascending: true });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeframe,
      from: parseInt(from),
      to: parseInt(to),
      count: candles?.length || 0,
      data: candles || []
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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

    // Store in new candles table
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
      stored: 'candles table',
      sample: candles.slice(0, 3)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/candles', async (req, res) => {
  try {
    const { data: candles } = await supabase
      .from('candles')
      .select('*')
      .order('timestamp', { ascending: true });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: candles?.length || 0,
      data: candles || []
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auto-update every minute
setInterval(async () => {
  try {
    await updateCandles();
  } catch (error) {
    console.error('Auto-update error:', error);
  }
}, 60000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  updateCandles(); // Initial run
});
