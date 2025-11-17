module.exports = async (req, res) => {
  res.json({ 
    message: 'Price Extraction Server - Vercel',
    status: 'running',
    endpoints: ['/api/extract', '/api/latest'],
    timestamp: new Date().toISOString()
  });
};
