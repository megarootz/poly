
const express = require('express');
const moment = require('moment');
const cors = require('cors');
const { PolygonClient } = require('./polygon-client');
const { analyzeStrategy } = require('./strategy');

const app = express();

// Initialize Polygon.io client
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
if (!POLYGON_API_KEY) {
  console.error('❌ POLYGON_API_KEY environment variable is required');
  process.exit(1);
}

const polygonClient = new PolygonClient(POLYGON_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Polygon.io Trading API is running!',
    endpoints: [
      'POST /analysis - Analyze market with body: { symbol: "XAUUSD" }',
      'GET /price/:symbol - Get current price (e.g., /price/XAUUSD)'
    ],
    data_provider: 'Polygon.io'
  });
});

// Market analysis endpoint
app.post('/analysis', async (req, res) => {
  try {
    const { symbol = 'XAUUSD' } = req.body;
    
    const timeframes = [
      { name: 'M15', days: 7 },    // 15-minute timeframe for short-term analysis
      { name: 'H1', days: 30 },    // Timeframe utama
      { name: 'H4', days: 90 },    // Konteks jangka menengah
      { name: 'D1', days: 365 }    // Konteks jangka panjang
    ];
    const result = {};

    console.log(`🚀 Starting Polygon.io analysis for ${symbol} across ${timeframes.length} timeframes`);

    // Process one by one to save memory
    for (const tf of timeframes) {
      const from = moment().subtract(tf.days, 'days').toDate();
      const to = new Date();

      console.log(`📊 Fetching ${symbol} ${tf.name} data from ${from.toISOString()} to ${to.toISOString()}`);
      
      try {
        const candles = await polygonClient.getCandles(symbol, tf.name, from, to);
        console.log(`📈 Retrieved ${candles?.length || 0} candles for ${tf.name}`);
        
        // Analyze the strategy for this timeframe using your existing strategy
        const analysis = analyzeStrategy(candles, tf.name);
        result[tf.name] = analysis;
        
        console.log(`✅ ${tf.name} analysis completed:`, {
          trend: analysis.trend,
          signal: analysis.signal,
          candleCount: candles?.length || 0
        });
        
      } catch (tfError) {
        console.error(`❌ Error processing ${tf.name}:`, tfError);
        result[tf.name] = {
          trend: 'Error',
          signal: 'Error',
          entry: 0,
          sl: 0,
          tp: 0,
          rsi: 0,
          atr: 0,
          error: `Failed to process ${tf.name}: ${tfError.message}`
        };
      }
      
      // Small delay between timeframes to be gentle on API limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎉 Analysis completed for ${symbol}. Results:`, Object.keys(result));
    res.json({ 
      symbol, 
      analysis: result, 
      data_provider: 'Polygon.io',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Analysis error:', err);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: err.message,
      data_provider: 'Polygon.io'
    });
  }
});

// Real-time price endpoint
app.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    console.log(`💰 Fetching current price for ${symbol}`);
    
    // Try to get current price, fallback to aggregates method
    let price = await polygonClient.getCurrentPrice(symbol);
    
    if (!price) {
      console.log(`🔄 Falling back to aggregates method for ${symbol} price`);
      price = await polygonClient.getCurrentPriceFromAggregates(symbol);
    }
    
    if (price) {
      console.log(`✅ Current price for ${symbol}: ${price}`);
    } else {
      console.warn(`⚠️ No price available for ${symbol}`);
    }
    
    res.json({ 
      symbol, 
      price,
      data_provider: 'Polygon.io',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Price error:', error);
    res.status(500).json({ 
      error: error.message,
      data_provider: 'Polygon.io'
    });
  }
});

// Use port from environment variable or 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Available timeframes: M15, H1, H4, D1`);
  console.log(`🔌 Data provider: Polygon.io`);
  console.log(`🔑 API Key configured: ${POLYGON_API_KEY ? 'Yes' : 'No'}`);
});
