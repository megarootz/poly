import axios from 'axios';

class PolygonClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.polygon.io';
    }

    async getCandles(symbol, timeframe, from, to) {
        try {
            // Validate inputs
            if (!symbol || !timeframe || !from || !to) {
                throw new Error('Missing required parameters: symbol, timeframe, from, to');
            }

            // Convert timeframe to polygon.io format
            let multiplier = 1;
            let timespan = 'minute';
            
            switch(timeframe) {
                case 'M1':
                    multiplier = 1;
                    timespan = 'minute';
                    break;
                case 'M5':
                    multiplier = 5;
                    timespan = 'minute';
                    break;
                case 'M15':
                    multiplier = 15;
                    timespan = 'minute';
                    break;
                case 'M30':
                    multiplier = 30;
                    timespan = 'minute';
                    break;
                case 'H1':
                    multiplier = 1;
                    timespan = 'hour';
                    break;
                case 'H4':
                    multiplier = 4;
                    timespan = 'hour';
                    break;
                case 'D1':
                    multiplier = 1;
                    timespan = 'day';
                    break;
                default:
                    console.warn(`⚠️ Unknown timeframe ${timeframe}, defaulting to M1`);
                    multiplier = 1;
                    timespan = 'minute';
            }

            const fromDate = from.toISOString().split('T')[0];
            const toDate = to.toISOString().split('T')[0];

            const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromDate}/${toDate}`;
            
            console.log(`📡 Fetching ${symbol} ${timeframe} data from Polygon.io`);

            const response = await axios.get(url, {
                params: {
                    apikey: this.apiKey,
                    adjusted: true,
                    sort: 'asc',
                    limit: 50000
                },
                timeout: 45000,
                headers: {
                    'User-Agent': 'polygon-trading-api/1.0.0'
                }
            });

            if (response.data && response.data.results) {
                const candles = response.data.results.map(item => ({
                    timestamp: new Date(item.t),
                    open: item.o,
                    high: item.h,
                    low: item.l,
                    close: item.c,
                    volume: item.v || 0
                }));

                console.log(`✅ Retrieved ${candles.length} candles for ${symbol} ${timeframe}`);
                return candles;
            } else {
                console.warn(`⚠️ No data returned for ${symbol} ${timeframe}`);
                return [];
            }

        } catch (error) {
            console.error(`❌ Error fetching candles for ${symbol}:`, error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            throw new Error(`Failed to fetch ${symbol} data: ${error.message}`);
        }
    }

    async getCurrentPrice(symbol) {
        try {
            const url = `${this.baseUrl}/v2/last/trade/${symbol}`;
            
            const response = await axios.get(url, {
                params: {
                    apikey: this.apiKey
                },
                timeout: 10000
            });

            if (response.data && response.data.results) {
                return {
                    price: response.data.results.p,
                    timestamp: new Date(response.data.results.t),
                    size: response.data.results.s
                };
            } else {
                throw new Error('No price data available');
            }

        } catch (error) {
            console.error(`❌ Error fetching current price for ${symbol}:`, error.message);
            throw new Error(`Failed to fetch current price: ${error.message}`);
        }
    }

    async getMarketStatus() {
        try {
            const url = `${this.baseUrl}/v1/marketstatus/now`;
            
            const response = await axios.get(url, {
                params: {
                    apikey: this.apiKey
                },
                timeout: 10000
            });

            return response.data;

        } catch (error) {
            console.error('❌ Error fetching market status:', error.message);
            throw new Error(`Failed to fetch market status: ${error.message}`);
        }
    }
}

module.exports = { PolygonClient };
