const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const BINANCE_API = 'https://api.binance.com/api/v3/klines';

async function extractCandleData() {
  const timeframes = [
    { interval: '4h', limit: 100, name: '4H' },
    { interval: '1h', limit: 168, name: '1H' },
    { interval: '15m', limit: 200, name: '15min' },
    { interval: '1m', limit: 1440, name: '1min' }
  ];

  const candleData = {};
  const errors = [];

  for (const tf of timeframes) {
    try {
      console.log(`Fetching ${tf.name} data from Binance...`);
      
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
        volume: parseFloat(candle[5]),
        symbol: 'BTCUSDT'
      }));

      candleData[tf.name] = candles;
      console.log(`✅ ${tf.name}: ${candles.length} candles fetched`);
      
    } catch (error) {
      console.error(`❌ Error extracting ${tf.name}:`, error.message);
      candleData[tf.name] = [];
      errors.push(`${tf.name}: ${error.message}`);
    }
  }

  // Store in separate tables
  const tableMap = {
    '4H': 'candles_4h',
    '1H': 'candles_1h', 
    '15min': 'candles_15min',
    '1min': 'candles_1min'
  };

  const storageResults = {};

  for (const [timeframe, candles] of Object.entries(candleData)) {
    const tableName = tableMap[timeframe];
    if (!tableName || candles.length === 0) {
      storageResults[timeframe] = 'No data to store';
      continue;
    }

    try {
      console.log(`Storing ${candles.length} ${timeframe} candles in ${tableName}...`);
      
      const { data, error } = await supabase
        .from(tableName)
        .upsert(candles, { 
          onConflict: 'time,symbol',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error(`❌ Supabase error for ${timeframe}:`, error);
        storageResults[timeframe] = `Error: ${error.message}`;
        errors.push(`${timeframe} storage: ${error.message}`);
      } else {
        console.log(`✅ ${timeframe}: Stored successfully`);
        storageResults[timeframe] = 'Stored successfully';
      }
      
    } catch (error) {
      console.error(`❌ Storage error for ${timeframe}:`, error);
      storageResults[timeframe] = `Error: ${error.message}`;
      errors.push(`${timeframe} storage: ${error.message}`);
    }
  }

  return { candleData, storageResults, errors };
}

module.exports = async (req, res) => {
  try {
    console.log('🚀 Starting candle extraction...');
    
    const result = await extractCandleData();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result.candleData,
      storage: result.storageResults,
      errors: result.errors
    });
    
  } catch (error) {
    console.error('❌ Main extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
