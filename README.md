
# Polygon.io Trading API

A Node.js trading API that uses Polygon.io for real-time forex data and technical analysis.

## Features

- ✅ Real-time forex price data from Polygon.io
- ✅ Multi-timeframe technical analysis (M15, H1, H4, D1)
- ✅ Advanced breakout detection strategy
- ✅ Support/resistance level identification
- ✅ RSI, ATR, and moving average indicators
- ✅ Risk management with stop-loss and take-profit levels

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   export POLYGON_API_KEY=your_polygon_api_key_here
   export PORT=10000
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## API Endpoints

### Health Check
```
GET /
```

### Market Analysis
```
POST /analysis
Content-Type: application/json

{
  "symbol": "XAUUSD"
}
```

Response includes analysis for M15, H1, H4, and D1 timeframes with:
- Trend direction
- Trading signals (BUY/SELL/HOLD)
- Entry, stop-loss, and take-profit levels
- Technical indicators (RSI, ATR)
- Breakout detection

### Current Price
```
GET /price/:symbol
```

Example: `GET /price/XAUUSD`

## Supported Symbols

- XAUUSD (Gold)
- EURUSD, GBPUSD, USDJPY, USDCHF
- AUDUSD, USDCAD, NZDUSD
- EURJPY, GBPJPY, EURGBP, EURCHF
- And more major forex pairs

## Deployment

### Render.com
1. Connect your GitHub repository
2. Set environment variable: `POLYGON_API_KEY`
3. Deploy with Node.js runtime

### Railway
1. Connect repository
2. Add `POLYGON_API_KEY` environment variable
3. Deploy

## Environment Variables

- `POLYGON_API_KEY` - Your Polygon.io API key (required)
- `PORT` - Server port (default: 10000)

## Technical Analysis Strategy

The API uses an advanced breakout strategy that:
1. Identifies significant support/resistance levels
2. Detects breakout patterns with confirmation
3. Validates retests and volume confirmation
4. Provides risk-managed entry/exit levels

## License

MIT License
