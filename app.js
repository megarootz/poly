import express from 'express';
import moment from 'moment';
import cors from 'cors';
import { PolygonClient } from './polygon-client.js';
import { analyzeStrategy } from './strategy.js';

const app = express();

// Initialize Polygon.io client
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
if (!POLYGON_API_KEY) {
    console.error('❌ POLYGON_API_KEY environment variable is required');
    console.error('Please set your Polygon.io API key in the environment variables');
    process.exit(1);
}

console.log('✅ Polygon API key loaded successfully');

const polygonClient = new PolygonClient(POLYGON_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Polygon.io Trading API is running!',
        endpoints: [
            'GET /polygon/symbol - Get current price (e.g., /polygon/XAUUSD)',
            'POST /analysis - Analyze market with body: { symbol: "XAUUSD" }'
        ],
        data_provider: 'Polygon.io'
    });
});

// Market analysis endpoint
app.post('/analysis', async (req, res) => {
    try {
        const { symbol = "XAUUSD" } = req.body;

        const timeframes = [
            { name: 'M15', days: 30 },    // 15-minute timeframe for short term analysis
            { name: 'H1', days: 30 },     // 1-hour timeframe
            { name: 'H4', days: 90 },     // 4-hour timeframe
            { name: 'D1', days: 365 }     // Daily timeframe
        ];

        const results = [];

        console.log(`🚀 Starting Polygon.io analysis for ${symbol} across ${timeframes.length} timeframes`);

        // Process one by one to save memory
        for (const tf of timeframes) {
            const from = moment().subtract(tf.days, 'days').toDate();
            const to = new Date();

            console.log(`📊 Fetching ${symbol} ${tf.name} data from ${from.toISOString()} to ${to.toISOString()}`);

            try {
                const candles = await polygonClient.getCandles(symbol, tf.name, from, to);
                console.log(`📈 Retrieved ${candles.length || 0} candles for ${tf.name}`);

                // Analyze the strategy for this timeframe using your existing strategy
                const analysis = analyzeStrategy(candles, tf.name);
                results[tf.name] = analysis;

                console.log(`✅ ${tf.name} analysis completed: {
                    trend: analysis.trend,
                    signal: analysis.signal,
                   ...
                }`);

            } catch (error) {
                console.error(`❌ Error fetching ${tf.name} data:`, error.message);
                results[tf.name] = { error: error.message };
            }
        }

        res.json({
            symbol,
            timestamp: new Date().toISOString(),
            analysis: results,
            provider: 'Polygon.io'
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current price endpoint
app.get('/polygon/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const price = await polygonClient.getCurrentPrice(symbol);
        res.json({ symbol, price, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('Price fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development'? err.message : 'Something went wrong'
    });
});

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        message: `The endpoint ${req.originalUrl} does not exist`
    });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Use PORT environment variable for render.com compatibility
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Polygon.io Trading API ready`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('❌ Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
    }
});
