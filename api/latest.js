const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
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
        console.error(`Error fetching ${timeframe}:`, error);
        candleData[timeframe] = [];
      } else {
        candleData[timeframe] = data.reverse();
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
};
