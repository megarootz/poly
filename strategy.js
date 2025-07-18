
const technicalindicators = require('technicalindicators');

// Helper: Find significant support/resistance levels
function findSignificantLevels(highs, lows, closingPrices, period = 50) {
  const significantLevels = [];
  const pivotHighs = [];
  const pivotLows = [];

  // Identifikasi pivot points
  for (let i = period; i < highs.length - period; i++) {
    const highWindow = highs.slice(i - period, i + period + 1);
    const lowWindow = lows.slice(i - period, i + period + 1);
    
    if (highs[i] === Math.max(...highWindow)) {
      pivotHighs.push(highs[i]);
    }
    
    if (lows[i] === Math.min(...lowWindow)) {
      pivotLows.push(lows[i]);
    }
  }

  // Gabungkan dan urutkan level signifikan
  significantLevels.push(...pivotHighs, ...pivotLows);
  significantLevels.sort((a, b) => a - b);
  
  return [...new Set(significantLevels)]; // Hapus duplikat
}

function analyzeStrategy(candles, timeframe = 'UNKNOWN') {
  console.log(`🔍 Starting analysis for ${timeframe} with ${candles?.length || 0} candles`);
  
  // Enhanced validation for M15 and other timeframes
  if (!candles || !Array.isArray(candles)) {
    console.error(`❌ ${timeframe}: Invalid candles data`, candles);
    return {
      trend: 'Error',
      signal: 'Error',
      entry: 0,
      sl: 0,
      tp: 0,
      rsi: 0,
      atr: 0,
      error: `Invalid candles data for ${timeframe}`
    };
  }

  // Different minimum requirements for different timeframes
  let minCandles = 50;
  if (timeframe === 'M15') {
    minCandles = 30; // Lower requirement for M15 due to more frequent data
  } else if (timeframe === 'H1') {
    minCandles = 40;
  } else if (timeframe === 'H4') {
    minCandles = 45;
  }

  if (candles.length < minCandles) {
    console.warn(`⚠️ ${timeframe}: Insufficient data - got ${candles.length}, need ${minCandles}`);
    return {
      trend: 'Insufficient Data',
      signal: 'No Signal',
      entry: 0,
      sl: 0,
      tp: 0,
      rsi: 0,
      atr: 0,
      error: `Insufficient historical data for ${timeframe} analysis (${candles.length}/${minCandles} candles)`
    };
  }

  // Validate candle structure
  const invalidCandles = candles.filter(c => 
    !c || typeof c.close !== 'number' || typeof c.high !== 'number' || 
    typeof c.low !== 'number' || c.high < c.low || c.close <= 0
  );

  if (invalidCandles.length > 0) {
    console.error(`❌ ${timeframe}: Found ${invalidCandles.length} invalid candles`);
    return {
      trend: 'Error',
      signal: 'Error',
      entry: 0,
      sl: 0,
      tp: 0,
      rsi: 0,
      atr: 0,
      error: `Invalid candle data structure for ${timeframe}`
    };
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume || 0);

  console.log(`📊 ${timeframe}: Processing data - Close range: ${Math.min(...closes).toFixed(5)} to ${Math.max(...closes).toFixed(5)}`);

  try {
    const currentClose = closes[closes.length - 1];
    
    // Calculate technical indicators with error handling
    let currentRsi = 50;
    let currentAtr = 0;
    let currentSma20 = currentClose;
    let currentSma50 = currentClose;

    try {
      const rsi = technicalindicators.RSI.calculate({
        period: Math.min(14, Math.floor(closes.length / 3)),
        values: closes
      });
      currentRsi = rsi.length > 0 ? rsi[rsi.length - 1] : 50;
    } catch (rsiError) {
      console.warn(`⚠️ ${timeframe}: RSI calculation failed`, rsiError.message);
    }

    try {
      const atr = technicalindicators.ATR.calculate({
        period: Math.min(14, Math.floor(closes.length / 3)),
        high: highs,
        low: lows,
        close: closes
      });
      currentAtr = atr.length > 0 ? atr[atr.length - 1] : (Math.max(...highs) - Math.min(...lows)) * 0.01;
    } catch (atrError) {
      console.warn(`⚠️ ${timeframe}: ATR calculation failed`, atrError.message);
      currentAtr = (Math.max(...highs) - Math.min(...lows)) * 0.01;
    }

    // Calculate moving averages for trend
    try {
      const sma20 = technicalindicators.SMA.calculate({
        period: Math.min(20, Math.floor(closes.length / 2)),
        values: closes
      });
      currentSma20 = sma20.length > 0 ? sma20[sma20.length - 1] : currentClose;

      const sma50 = technicalindicators.SMA.calculate({
        period: Math.min(50, Math.floor(closes.length * 0.8)),
        values: closes
      });
      currentSma50 = sma50.length > 0 ? sma50[sma50.length - 1] : currentClose;
    } catch (smaError) {
      console.warn(`⚠️ ${timeframe}: SMA calculation failed`, smaError.message);
    }

    // Determine trend
    let trend = 'Sideways';
    if (currentClose > currentSma20 && currentSma20 > currentSma50) {
      trend = 'Uptrend';
    } else if (currentClose < currentSma20 && currentSma20 < currentSma50) {
      trend = 'Downtrend';
    }

    // Initialize signal variables
    let signal = 'Hold';
    let entry = 0, sl = 0, tp = 0;

    // Ensure we have a reasonable ATR value
    if (currentAtr === 0 || isNaN(currentAtr)) {
      currentAtr = Math.abs(currentClose * 0.001); // 0.1% of price as fallback
    }

    // 1. Tentukan level support/resistance signifikan
    const significantLevels = findSignificantLevels(highs, lows, closes, Math.min(20, Math.floor(closes.length / 4)));
    
    // 2. Identifikasi level breakout terdekat
    const resistanceLevels = significantLevels.filter(l => l > currentClose);
    const supportLevels = significantLevels.filter(l => l < currentClose);
    
    const nearestResistance = resistanceLevels.length > 0 ? Math.min(...resistanceLevels) : currentClose * 1.02;
    const nearestSupport = supportLevels.length > 0 ? Math.max(...supportLevels) : currentClose * 0.98;
    
    // 3. Deteksi breakout
    let breakoutLevel = null;
    let breakoutDirection = null;
    
    if (currentClose > nearestResistance) {
      breakoutLevel = nearestResistance;
      breakoutDirection = "UP";
    } else if (currentClose < nearestSupport) {
      breakoutLevel = nearestSupport;
      breakoutDirection = "DOWN";
    }

    // 4. Konfirmasi retest dan candle
    let confirmedBreakout = false;
    
    if (breakoutLevel) {
      // Cek retest (harga kembali mendekati level breakout)
      const retestThreshold = breakoutLevel * 0.995; // 0.5% tolerance
      const recentPrices = closes.slice(-Math.min(5, Math.floor(closes.length / 10)));
      
      const hasRetest = breakoutDirection === "UP" 
        ? recentPrices.some(p => p <= breakoutLevel * 1.005 && p >= retestThreshold)
        : recentPrices.some(p => p >= breakoutLevel * 0.995 && p <= breakoutLevel * 1.005);
      
      // Cek candle konfirmasi (candle besar atau volume tinggi)
      const currentCandle = candles[candles.length - 1];
      const candleSize = currentCandle.high - currentCandle.low;
      
      const recentCandles = Math.min(10, Math.floor(candles.length / 5));
      const avgCandleSize = highs.slice(-recentCandles)
        .map((h, i) => h - lows.slice(-recentCandles)[i])
        .reduce((a, b) => a + b, 0) / recentCandles;
      
      const isLargeCandle = candleSize > avgCandleSize * 1.5;
      const isHighVolume = volumes.length > 0 && volumes.slice(-Math.min(10, volumes.length)).length > 0
        ? currentCandle.volume > volumes.slice(-Math.min(10, volumes.length)).reduce((a, b) => a + b, 0) / Math.min(10, volumes.length) * 1.5
        : false;
      
      confirmedBreakout = hasRetest && (isLargeCandle || isHighVolume);
    }

    // 5. Generate sinyal berdasarkan konfirmasi breakout
    if (confirmedBreakout) {
      if (breakoutDirection === "UP" && trend === "Uptrend") {
        signal = "BUY";
        entry = currentClose;
        sl = entry - (currentAtr * 1.5);
        tp = entry + ((entry - sl) * 2); // RR 1:2
      } else if (breakoutDirection === "DOWN" && trend === "Downtrend") {
        signal = "SELL";
        entry = currentClose;
        sl = entry + (currentAtr * 1.5);
        tp = entry - ((sl - entry) * 2); // RR 1:2
      }
    } else {
      // Fallback signals based on RSI and trend
      if (trend === 'Uptrend' && currentRsi < 40) {
        signal = 'BUY';
        entry = currentClose;
        sl = entry - (currentAtr * 2);
        tp = entry + (currentAtr * 3);
      } else if (trend === 'Downtrend' && currentRsi > 60) {
        signal = 'SELL';
        entry = currentClose;
        sl = entry + (currentAtr * 2);
        tp = entry - (currentAtr * 3);
      }
    }

    const result = {
      trend: trend,
      signal: signal,
      entry: Number(entry.toFixed(5)),
      sl: Number(sl.toFixed(5)),
      tp: Number(tp.toFixed(5)),
      rsi: Number(currentRsi.toFixed(2)),
      atr: Number(currentAtr.toFixed(5)),
      breakout_level: breakoutLevel ? Number(breakoutLevel.toFixed(5)) : null,
      breakout_direction: breakoutDirection,
      breakout_confirmed: confirmedBreakout
    };

    console.log(`✅ ${timeframe}: Analysis completed successfully`, result);
    return result;

  } catch (error) {
    console.error(`❌ ${timeframe}: Strategy analysis error:`, error);
    return {
      trend: 'Error',
      signal: 'Error',
      entry: 0,
      sl: 0,
      tp: 0,
      rsi: 0,
      atr: 0,
      error: `${timeframe} analysis failed: ${error.message}`
    };
  }
}

// CRITICAL: This export statement must be at the end of your strategy.js file
module.exports = { analyzeStrategy };
