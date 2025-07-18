
const fetch = require('node-fetch');

class PolygonClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.polygon.io';
  }

  // Map trading symbols to Polygon.io format
  mapSymbolToPolygon(symbol) {
    const symbolMap = {
      'XAUUSD': 'C:XAUUSD',
      'EURUSD': 'C:EURUSD',
      'GBPUSD': 'C:GBPUSD',
      'USDJPY': 'C:USDJPY',
      'USDCHF': 'C:USDCHF',
      'AUDUSD': 'C:AUDUSD',
      'USDCAD': 'C:USDCAD',
      'NZDUSD': 'C:NZDUSD',
      'EURJPY': 'C:EURJPY',
      'GBPJPY': 'C:GBPJPY',
      'EURGBP': 'C:EURGBP',
      'EURCHF': 'C:EURCHF',
      'GBPCHF': 'C:GBPCHF',
      'AUDJPY': 'C:AUDJPY',
      'CADJPY': 'C:CADJPY',
      'CHFJPY': 'C:CHFJPY'
    };
    
    return symbolMap[symbol.toUpperCase()] || `C:${symbol.toUpperCase()}`;
  }

  // Map timeframes to Polygon.io multiplier and timespan
  mapTimeframeToPolygon(timeframe) {
    const timeframeMap = {
      'M1': { multiplier: 1, timespan: 'minute' },
      'M15': { multiplier: 15, timespan: 'minute' },
      'H1': { multiplier: 1, timespan: 'hour' },
      'H4': { multiplier: 4, timespan: 'hour' },
      'D1': { multiplier: 1, timespan: 'day' }
    };
    
    return timeframeMap[timeframe.toUpperCase()] || { multiplier: 1, timespan: 'hour' };
  }

  // Get historical aggregates (candlestick data)
  async getCandles(symbol, timeframe, from, to) {
    try {
      const polygonSymbol = this.mapSymbolToPolygon(symbol);
      const { multiplier, timespan } = this.mapTimeframeToPolygon(timeframe);
      
      // Format dates for Polygon.io API
      const fromDate = from.toISOString().split('T')[0];
      const toDate = to.toISOString().split('T')[0];
      
      const url = `${this.baseUrl}/v2/aggs/ticker/${polygonSymbol}/range/${multiplier}/${timespan}/${fromDate}/${toDate}`;
      const params = new URLSearchParams({
        adjusted: 'true',
        sort: 'asc',
        limit: '50000',
        apikey: this.apiKey
      });

      console.log(`🔍 Polygon.io API call: ${url}?${params}`);
      
      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Polygon.io API error (${response.status}):`, errorText);
        throw new Error(`Polygon.io API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.warn(`⚠️ Polygon.io API warning:`, data);
        return [];
      }

      if (!data.results || data.results.length === 0) {
        console.warn(`⚠️ No data returned for ${symbol} ${timeframe}`);
        return [];
      }

      // Convert Polygon.io format to your existing format
      const candles = data.results.map(bar => ({
        timestamp: new Date(bar.t).toISOString(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v || 0
      }));

      console.log(`✅ Retrieved ${candles.length} candles for ${symbol} ${timeframe}`);
      return candles;

    } catch (error) {
      console.error(`❌ Error fetching candles for ${symbol} ${timeframe}:`, error);
      throw error;
    }
  }

  // Get current/latest price
  async getCurrentPrice(symbol) {
    try {
      const polygonSymbol = this.mapSymbolToPolygon(symbol);
      
      const url = `${this.baseUrl}/v2/last/trade/${polygonSymbol}`;
      const params = new URLSearchParams({
        apikey: this.apiKey
      });

      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Polygon.io price API error (${response.status}):`, errorText);
        throw new Error(`Polygon.io price API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results) {
        console.warn(`⚠️ No current price available for ${symbol}`);
        return null;
      }

      return data.results.p; // Price from the latest trade

    } catch (error) {
      console.error(`❌ Error fetching current price for ${symbol}:`, error);
      throw error;
    }
  }

  // Alternative method using aggregates for current price (more reliable for forex)
  async getCurrentPriceFromAggregates(symbol) {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const candles = await this.getCandles(symbol, 'M1', yesterday, now);
      
      if (candles.length === 0) {
        return null;
      }
      
      // Return the close price of the latest candle
      return candles[candles.length - 1].close;

    } catch (error) {
      console.error(`❌ Error fetching current price via aggregates for ${symbol}:`, error);
      return null;
    }
  }
}

module.exports = { PolygonClient };
