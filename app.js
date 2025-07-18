import express from 'express';
import cors from 'cors';
import moment from 'moment';
import { SMA, EMA, RSI, MACD, BollingerBands, Stochastic } from 'technicalindicators';
import { PolygonClient } from './polygon-client.js';

const app = express();
const PORT = process.env.PORT || 10000;

// Initialize Polygon client
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'vIJ684t_i7p21GexJfBXPGfkocmftxJg';
const polygonClient = new PolygonClient(POLYGON_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Available timeframes
const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];

// Calculate date ranges for different timeframes
const getDateRange = (timeframe) => {
  const now = new Date();
  let from;
  
  switch (timeframe) {
    case 'M15':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
      break;
    case 'H1':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
      break;
    case 'H4':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days
      break;
    case 'D1':
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year
      break;
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  
  return { from, to: now };
};

// Technical analysis function
const performTechnicalAnalysis = (candles) => {
  if (!candles || candles.length < 14) {
    return {
      trend: 'Insufficient Data',
      signal: 'No Signal',
      entry: 0,
      sl: 0,
      tp: 0,
      rsi: 0,
      atr: 0
    };
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // Calculate indicators
  const rsi = RSI.calculate({ values: closes, period: 14 });
  const sma20 = SMA.calculate({ values: closes, period: 20 });
  const sma50 = SMA.calculate({ values: closes, period: 50 });

  const currentPrice = closes[closes.length - 1];
  const currentRSI = rsi[rsi.length - 1] || 50;
  const currentSMA20 = sma20[sma20.length - 1] || currentPrice;
  const currentSMA50 = sma50[sma50.length - 1] || currentPrice;

  // Determine trend
  let trend = 'Sideways';
  if (currentPrice > currentSMA20 && currentSMA20 > currentSMA50) {
    trend = 'Bullish';
  } else if (currentPrice < currentSMA20 && currentSMA20 < currentSMA50) {
    trend = 'Bearish';
  }

  // Generate signals
  let signal = 'Hold';
  if (currentRSI < 30 && trend === 'Bullish') {
    signal = 'Buy';
  } else if (currentRSI > 70 && trend === 'Bearish') {
    signal = 'Sell';
  }

  // Calculate ATR for position sizing
  const atr = calculateATR(candles);

  return {
    trend,
    signal,
    entry: currentPrice,
    sl: signal === 'Buy' ? currentPrice - (atr * 2) : currentPrice + (atr * 2),
    tp: signal === 'Buy' ? currentPrice + (atr * 3) : currentPrice - (atr * 3),
    rsi: currentRSI,
    atr: atr
  };
};

// Calculate Average True Range
const calculateATR = (candles, period = 14) => {
  if (candles.length < period + 1) return 0;

  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  const atrValues = SMA.calculate({ values: trueRanges, period });
  return atrValues[atrValues.length - 1] || 0;
};

// Main analysis endpoint
app.post('/analysis', async (req, res) => {
  try {
    const { symbol, timeframes } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const targetTimeframes = timeframes || TIMEFRAMES;
    console.log(`🚀 Starting Polygon.io analysis for ${symbol} across ${targetTimeframes.length} timeframes`);

    const results = {};

    // Process each timeframe
    for (const timeframe of targetTimeframes) {
      try {
        const { from, to } = getDateRange(timeframe);
        
        console.log(`📊 Fetching ${symbol} ${timeframe} data from ${from.toISOString()} to ${to.toISOString()}`);
        console.log(`📡 Fetching ${symbol} ${timeframe} data from Polygon.io`);

        const candles = await polygonClient.getCandles(symbol, timeframe, from, to);
        
        console.log(`📈 Retrieved ${candles.length} candles for ${timeframe}`);

        if (candles.length === 0) {
          console.warn(`⚠️ No data returned for ${symbol} ${timeframe}`);
        }

        const analysis = performTechnicalAnalysis(candles);
        results[timeframe] = analysis;

        console.log(`✅ ${timeframe} analysis completed: {
                    trend: ${analysis.trend},
                    signal: ${analysis.signal},
                    entry: ${analysis.entry},
                    rsi: ${analysis.rsi}
                }`);

      } catch (error) {
        console.error(`❌ Error processing ${timeframe}:`, error.message);
        results[timeframe] = {
          trend: 'Error',
          signal: 'Error',
          entry: 0,
          sl: 0,
          tp: 0,
          rsi: 0,
          atr: 0,
          error: error.message
        };
      }
    }

    console.log(`🎉 Analysis completed for ${symbol}. Results:`, Object.keys(results));

    res.json({
      symbol,
      analysis: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Analysis endpoint error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    timeframes: TIMEFRAMES,
    provider: 'Polygon.io'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Polygon Trading API',
    version: '1.0.0',
    timeframes: TIMEFRAMES,
    endpoints: {
      analysis: 'POST /analysis',
      health: 'GET /health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Available timeframes: ${TIMEFRAMES.join(', ')}`);
  console.log(`🔌 Data provider: Polygon.io`);
  console.log(`🔑 API Key configured: ${POLYGON_API_KEY ? 'Yes' : 'No'}`);
});
