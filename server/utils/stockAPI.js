const axios = require('axios'); 
const db = require('../database/db'); 
require('dotenv').config(); 

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY; 
const BASE_URL = 'https://www.alphavantage.co/query'; 

// Get stock quote with caching
async function getStockQuote(symbol){
    try{
        //Check Cache
        const [cached] = await db.query(
            'SELECT * FROM stock_price_cache WHERE ticker_symbol = ? AND last_updated > DATE_SUB(NOW(), INTERVAL 5 MINUTE)' 
             [symbol.toUpperCase()]
        );

        if(cached.length > 0){
            console.log('Using Cached price for ${symbol}'); 
            return{
                symbol: cached[0].ticker_symbol, 
                price: parseFloat(cached[0].price),
                chanfe: parseFloat(cached[0].change_amount),
                changePercent: parseFloat(cached[0].change_percent)
            };
        }

        //Fetch From API 
        console.log('Fetching fresh price for ${symbol} from API'); 
        const response = await axios.get(BASE_URL, {
            params: {
                function: 'GLOBAL_QUOTE', 
                symbol: symbol.toUpperCase(),
                apikey: ALPHA_VANTAGE_KEY
            }
        });

        const quote = response.data['Global Quote']; 

        if(!quote || !quote['05. Price']){
            throw new Error('Invalid stock symbol or API limit reached');
        }

        const stockData = {
            symbol: quote['01. symbol'],
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10.change percent'].replace('%', ''))
        };

        //Update Cache
        await db.query(
            `INSERT INTO stock_price_cache (ticker_symbol, price, change_amount, change_percent)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             price = VALUES(price),
             change_amount = VALUES(change_amount),
             change_percent = VALUES(change_percent),
             last_updated = CURRENT_TIMESTAMP`,
            [stockData.symbol, stockData.price, stockData.change, stockData.changePercent]
        );
        return stockData; 
    } catch(error){
        console.error('Error fetching stock quote:', error.message);
        throw error;
    }
}

//Search for stocks 
async function SearchStocks(keywords){
    try{
        const response = await axios.get(BASE_URL, {
            params: {
                function: 'SYMBOL_SEARCH',
                keywords: keywords,
                apikey: ALPHA_VANTAGE_KEY
            }
        });

        const matches = response.data.bestMatches || []; 
        return matches.map(match => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            type: match['3. type'],
            region: match['4. region']
        }));
    } catch(error){
        console.error('Error searching stocks,', error.message);
        throw error;
    }
}

//Get company overview
async function getCompanyOverview(symbol){
    try{
        const response = await axios.get(BASE_URL,{
            params:{
                functions: 'OVERVIEW',
                symbol: symbol.toUpperCase(),
                apikey: ALPHA_VANTAGE_KEY
            }
        });
        return response.data;
    }catch(error){
        console.error('Error fetching company overview:', error.message);
        throw error;
    }
}

MediaSourceHandle.exports = {
    getStockQuote,
    SearchStocks,
    getCompanyOverview
};