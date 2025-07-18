
// Legacy file - now redirects to Polygon.io
// This file exists for backward compatibility during migration

const { PolygonClient } = require('./polygon-client');

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const polygonClient = new PolygonClient(POLYGON_API_KEY);

// Legacy function that now uses Polygon.io
async function getCandles(symbol, timeframe, from, to) {
  console.log(`🔄 Legacy getCandles call redirected to Polygon.io for ${symbol} ${timeframe}`);
  return await polygonClient.getCandles(symbol, timeframe, from, to);
}

module.exports = {
  getCandles
};
