# Polygon.io Trading Analysis API

API untuk analisis trading menggunakan data dari Polygon.io dengan berbagai timeframe dan indikator teknikal.

## Features

- ✅ Real-time market data dari Polygon.io
- ✅ Multi-timeframe analysis (M15, H1, H4, D1)
- ✅ Technical indicators (RSI, MACD, SMA, EMA)
- ✅ Trend detection dan trading signals
- ✅ RESTful API endpoints
- ✅ CORS enabled untuk web applications

## API Endpoints

### Health Check
```
GET /
```
Returns API status dan available endpoints.

### Market Analysis
```
POST /analysis
Content-Type: application/json

{
  "symbol": "XAUUSD"
}
```
Returns comprehensive technical analysis untuk symbol yang dipilih.

### Current Price
```
GET /polygon/:symbol
```
Returns current price untuk symbol tertentu.

## Installation & Setup

### Local Development

1. Clone repository
```bash
git clone <repository-url>
cd polygon-trading-api
```

2. Install dependencies
```bash
npm install
```

3. Set environment variables
```bash
# Create .env file
POLYGON_API_KEY=your_polygon_api_key_here
PORT=3000
```

4. Run application
```bash
npm start
# or for development
npm run dev
```

## Deployment di Render.com

### Prerequisites
- Account di [Render.com](https://render.com)
- Polygon.io API key dari [polygon.io](https://polygon.io)

### Steps untuk Deploy

1. **Push code ke GitHub repository**

2. **Connect repository di Render.com:**
   - Login ke Render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repository ini

3. **Configure deployment settings:**
   ```
   Name: polygon-trading-api
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Node Version: 18.x (or latest LTS)
   ```

4. **Set Environment Variables di Render.com:**
   ```
   POLYGON_API_KEY = your_actual_api_key_here
   NODE_ENV = production
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Render akan automatically deploy aplikasi

### Important Notes untuk Render.com

- ✅ **CommonJS Module Fix**: Package.json sekarang explicitly set `"type": "commonjs"` untuk mengatasi ES module error
- ✅ **Enhanced Error Handling**: Improved error handling untuk production deployment
- ✅ **Graceful Shutdown**: Process management untuk deployment stability
- ✅ Port configuration: App menggunakan `process.env.PORT` (required untuk Render)
- ✅ Start script: `npm start` command ada dalam package.json
- ✅ Node version: Specified dalam package.json engines
- ✅ Dependencies: Semua dependencies listed dalam package.json
- ✅ Health check endpoint: `/` endpoint untuk monitoring

### Common Deployment Issues Fixed

1. **ES Module Error**: 
   - ❌ Error: `require is not defined in ES module scope`
   - ✅ Fixed: Added `"type": "commonjs"` dalam package.json

2. **Missing Dependencies Error**:
   - ❌ Error: `Cannot find module 'technicalindicators'`
   - ✅ Fixed: Added technicalindicators dependency dalam package.json

3. **Timeout Issues**:
   - ✅ Increased API timeout untuk Polygon.io requests
   - ✅ Added proper error handling untuk network issues

4. **Process Management**:
   - ✅ Added graceful shutdown handling
   - ✅ Proper error logging untuk debugging

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `POLYGON_API_KEY` | API key dari polygon.io | ✅ Yes |
| `PORT` | Port number (auto-set oleh Render) | ✅ Auto |
| `NODE_ENV` | Environment mode | Optional |

## Usage Examples

### Test API selepas deployment

```bash
# Health check
curl https://your-app-name.onrender.com/

# Get analysis
curl -X POST https://your-app-name.onrender.com/analysis \
  -H "Content-Type: application/json" \
  -d '{"symbol":"XAUUSD"}'

# Get current price
curl https://your-app-name.onrender.com/polygon/XAUUSD
```

### Response Example

```json
{
  "symbol": "XAUUSD",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "analysis": {
    "M15": {
      "timeframe": "M15",
      "trend": "UPTREND",
      "signal": "BUY",
      "price": {
        "current": 2045.50,
        "change": 5.25,
        "changePercent": "0.26"
      },
      "indicators": {
        "rsi": "65.43",
        "macd": {
          "macd": "2.1543",
          "signal": "1.8932",
          "histogram": "0.2611"
        }
      }
    }
  }
}
```

## Technical Indicators

- **RSI (Relative Strength Index)**: Momentum oscillator (0-100)
- **MACD**: Moving Average Convergence Divergence
- **SMA**: Simple Moving Average
- **EMA**: Exponential Moving Average
- **Trend Detection**: Based on SMA crossovers

## Troubleshooting

### Common Deployment Issues

1. **Missing POLYGON_API_KEY**
   - Ensure environment variable is set di Render dashboard
   - Check API key validity di polygon.io

2. **Port Issues**
   - App automatically uses `process.env.PORT`
   - No manual port configuration needed

3. **Build Failures**
   - Check all dependencies ada dalam package.json
   - Ensure Node version compatibility

4. **API Errors**
   - Verify Polygon.io API key permissions
   - Check API rate limits

## Support

Untuk issues atau questions:
1. Check logs di Render dashboard
2. Verify environment variables
3. Test API endpoints manually

## License

ISC License
