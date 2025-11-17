const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Generate realistic Bitcoin candle data based on current price
async function generateCandleData() {
  const basePrice = 95000; // Current BTC price approximation
  const timeframes = [
    { interval: 240, count: 100, name: '4H' },    // 4H candles
    { interval: 60, count: 168, name: '1H' },     // 1H candles  
    { interval: 15, count: 200, name: '15min' },  // 15min candles
    { interval: 1, count: 1440, name: '1min' }    // 1min candles
  ];

  const candleData = {};
  const errors = [];

  for (const tf of timeframes) {
    try {
      console.log(`Generating ${tf.name} candle data...`);
      
      const candles = [];
      const now = Math.floor(Date.now() / 1000);
      let currentPrice = basePrice;
      
      for (let i = tf.count - 1; i >= 0; i--) {
        const time = now - (i * tf.interval * 60);
        
        // Generate realistic price movement
        const volatility = tf.interval * 0.001; // Higher volatility for longer timeframes
        const priceChange = (Math.random() - 0.5) * currentPrice * volatility;
        
        const open = currentPrice;
        const close = currentPrice + priceChange;
        const high = Math.max(open, close) + Math.random() * currentPrice * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * currentPrice * volatility * 0.5;
        const volume = Math.random() * 1000000 + 500000; // Random volume between 500k-1.5M
        
        candles.push({
          time: time,
          open: Math.round(open * 100) / 100,
          high: Math.round(high * 100) / 100,
          low: Math.round(low * 100) / 100,
          close: Math.round(close * 100) / 100,
          volume: Math.round(volume),
          symbol: 'BTCUSDT'
        });
        
        currentPrice = close; // Update for next candle
      }

      candleData[tf.name] = candles;
      console.log(`✅ ${tf.name}: ${candles.length} candles generated`);
      
    } catch (error) {
      console.error(`❌ Error generating ${tf.name}:`, error.message);
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
    console.log('🚀 Generating realistic Bitcoin candle data...');
    
    const result = await generateCandleData();
    
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
