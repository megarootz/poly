// Technical Analysis Strategy Module
// All indicators implemented manually without external dependencies



// ... (rest of the file remains the same)

export {
    analyzeStrategy,
    calculateSMA,
    calculateEMA,
    calculateRSI,
    calculateMACD,
    detectTrend,
    generateSignal
};

// Add this line at the top of the file
function calculateSMA(data, period) {
    if (data.length < period) return [];
    
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
        sma.push(sum / period);
    }
    return sma;
}

// ... (rest of the file remains the same)

function calculateEMA(data, period) {
    if (data.length < period) return [];
    
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    const firstSMA = data.slice(0, period).reduce((acc, val) => acc + val.close, 0) / period;
    ema.push(firstSMA);
    
    // Calculate subsequent EMAs
    for (let i = period; i < data.length; i++) {
        const currentEMA = (data[i].close * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
        ema.push(currentEMA);
    }
    
    return ema;
}

function calculateRSI(data, period = 14) {
    if (data.length < period + 1) return [];
    
    const gains = [];
    const losses = [];
    
    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsi = [];
    
    // Calculate first RSI
    const avgGain = gains.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
    const avgLoss = losses.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
    
    if (avgLoss === 0) {
        rsi.push(100);
    } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }
    
    // Calculate subsequent RSI values
    let currentAvgGain = avgGain;
    let currentAvgLoss = avgLoss;
    
    for (let i = period; i < gains.length; i++) {
        currentAvgGain = ((currentAvgGain * (period - 1)) + gains[i]) / period;
        currentAvgLoss = ((currentAvgLoss * (period - 1)) + losses[i]) / period;
        
        if (currentAvgLoss === 0) {
            rsi.push(100);
        } else {
            const rs = currentAvgGain / currentAvgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
    }
    
    return rsi;
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);
    
    if (fastEMA.length === 0 || slowEMA.length === 0) return { macd: [], signal: [], histogram: [] };
    
    const macdLine = [];
    const startIndex = slowPeriod - fastPeriod;
    
    for (let i = 0; i < slowEMA.length; i++) {
        macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
    }
    
    // Calculate signal line (EMA of MACD)
    const macdData = macdLine.map((value, index) => ({ close: value }));
    const signalLine = calculateEMA(macdData, signalPeriod);
    
    // Calculate histogram
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
        histogram.push(macdLine[i + signalPeriod - 1] - signalLine[i]);
    }
    
    return {
        macd: macdLine,
        signal: signalLine,
        histogram: histogram
    };
}

function detectTrend(data) {
    if (data.length < 20) return 'INSUFFICIENT_DATA';
    
    const sma20 = calculateSMA(data, 20);
    const sma50 = calculateSMA(data, 50);
    
    if (sma20.length === 0 || sma50.length === 0) return 'INSUFFICIENT_DATA';
    
    const currentSMA20 = sma20[sma20.length - 1];
    const currentSMA50 = sma50[sma50.length - 1];
    const currentPrice = data[data.length - 1].close;
    
    if (currentPrice > currentSMA20 && currentSMA20 > currentSMA50) {
        return 'UPTREND';
    } else if (currentPrice < currentSMA20 && currentSMA20 < currentSMA50) {
        return 'DOWNTREND';
    } else {
        return 'SIDEWAYS';
    }
}

function generateSignal(data) {
    if (data.length < 50) return 'INSUFFICIENT_DATA';
    
    const rsi = calculateRSI(data);
    const macd = calculateMACD(data);
    const trend = detectTrend(data);
    
    if (rsi.length === 0 || macd.macd.length === 0) return 'INSUFFICIENT_DATA';
    
    const currentRSI = rsi[rsi.length - 1];
    const currentMACD = macd.macd[macd.macd.length - 1];
    const currentSignal = macd.signal[macd.signal.length - 1];
    const currentHistogram = macd.histogram[macd.histogram.length - 1];
    
    let signals = [];
    
    // RSI signals
    if (currentRSI < 30) signals.push('RSI_OVERSOLD');
    if (currentRSI > 70) signals.push('RSI_OVERBOUGHT');
    
    // MACD signals
    if (currentMACD > currentSignal && currentHistogram > 0) signals.push('MACD_BULLISH');
    if (currentMACD < currentSignal && currentHistogram < 0) signals.push('MACD_BEARISH');
    
    // Trend-based signals
    if (trend === 'UPTREND' && currentRSI < 50) signals.push('TREND_BUY');
    if (trend === 'DOWNTREND' && currentRSI > 50) signals.push('TREND_SELL');
    
    // Determine overall signal
    const bullishSignals = signals.filter(s => s.includes('BULLISH') || s.includes('BUY') || s.includes('OVERSOLD')).length;
    const bearishSignals = signals.filter(s => s.includes('BEARISH') || s.includes('SELL') || s.includes('OVERBOUGHT')).length;
    
    if (bullishSignals > bearishSignals) {
        return 'BUY';
    } else if (bearishSignals > bullishSignals) {
        return 'SELL';
    } else {
        return 'HOLD';
    }
}

function analyzeStrategy(candles, timeframe) {
    try {
        if (!candles || candles.length === 0) {
            return {
                error: 'No candle data provided',
                timeframe: timeframe
            };
        }

        const trend = detectTrend(candles);
        const signal = generateSignal(candles);
        const rsi = calculateRSI(candles);
        const macd = calculateMACD(candles);
        
        const currentPrice = candles[candles.length - 1].close;
        const previousPrice = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
        const priceChange = currentPrice - previousPrice;
        const priceChangePercent = ((priceChange / previousPrice) * 100).toFixed(2);
        
        return {
            timeframe: timeframe,
            trend: trend,
            signal: signal,
            price: {
                current: currentPrice,
                change: priceChange,
                changePercent: priceChangePercent
            },
            indicators: {
                rsi: rsi.length > 0 ? rsi[rsi.length - 1].toFixed(2) : 'N/A',
                macd: {
                    macd: macd.macd.length > 0 ? macd.macd[macd.macd.length - 1].toFixed(4) : 'N/A',
                    signal: macd.signal.length > 0 ? macd.signal[macd.signal.length - 1].toFixed(4) : 'N/A',
                    histogram: macd.histogram.length > 0 ? macd.histogram[macd.histogram.length - 1].toFixed(4) : 'N/A'
                }
            },
            dataPoints: candles.length,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`Error in strategy analysis for ${timeframe}:`, error);
        return {
            error: error.message,
            timeframe: timeframe,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = {
    analyzeStrategy,
    calculateSMA,
    calculateEMA,
    calculateRSI,
    calculateMACD,
    detectTrend,
    generateSignal
};
