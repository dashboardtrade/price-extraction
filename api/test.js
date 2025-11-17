const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  try {
    console.log('Testing Supabase connection...');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Missing');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      return res.json({
        success: false,
        error: 'Environment variables missing',
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_key: !!process.env.SUPABASE_KEY
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Test connection by checking tables
    const { data, error } = await supabase
      .from('candles_1min')
      .select('count')
      .limit(1);

    res.json({
      success: !error,
      supabase_connected: !error,
      error: error?.message || null,
      env_vars: {
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_key: !!process.env.SUPABASE_KEY
      }
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      env_vars: {
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_key: !!process.env.SUPABASE_KEY
      }
    });
  }
};
