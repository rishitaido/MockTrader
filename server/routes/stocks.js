const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getStockQuote, searchStocks, getCompanyOverview } = require('../utils/stockAPI');

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}

// Search for stocks
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }
        
        const results = await searchStocks(query);
        res.json({ success: true, results });
        
    } catch (error) {
        console.error('Stock search error:', error);
        res.status(500).json({ error: 'Error searching stocks' });
    }
});

// Get stock quote
router.get('/quote/:symbol', requireAuth, async (req, res) => {
    try {
        const { symbol } = req.params;
        const quote = await getStockQuote(symbol);
        
        res.json({ success: true, quote });
        
    } catch (error) {
        console.error('Get quote error:', error);
        res.status(500).json({ error: 'Error fetching stock quote' });
    }
});

// Get company info
router.get('/company/:symbol', requireAuth, async (req, res) => {
    try {
        const { symbol } = req.params;
        const info = await getCompanyOverview(symbol);
        
        res.json({ success: true, info });
        
    } catch (error) {
        console.error('Get company info error:', error);
        res.status(500).json({ error: 'Error fetching company information' });
    }
});

// Get user's portfolio
router.get('/portfolio', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Get all holdings
        const [holdings] = await db.query(
            'SELECT * FROM portfolio_holdings WHERE user_id = ? ORDER BY ticker_symbol',
            [userId]
        );
        
        // Get current prices for each holding
        const portfolioWithPrices = await Promise.all(
            holdings.map(async (holding) => {
                try {
                    const quote = await getStockQuote(holding.ticker_symbol);
                    const currentValue = holding.total_shares * quote.price;
                    const costBasis = holding.total_shares * holding.average_cost_per_share;
                    const profitLoss = currentValue - costBasis;
                    const profitLossPercent = (profitLoss / costBasis) * 100;
                    
                    return {
                        ...holding,
                        currentPrice: quote.price,
                        currentValue: currentValue,
                        profitLoss: profitLoss,
                        profitLossPercent: profitLossPercent,
                        dayChange: quote.change,
                        dayChangePercent: quote.changePercent
                    };
                } catch (error) {
                    console.error(`Error fetching price for ${holding.ticker_symbol}:`, error);
                    return {
                        ...holding,
                        currentPrice: holding.average_cost_per_share,
                        currentValue: holding.total_shares * holding.average_cost_per_share,
                        profitLoss: 0,
                        profitLossPercent: 0,
                        error: 'Could not fetch current price'
                    };
                }
            })
        );
        
        // Get user's cash balance
        const [users] = await db.query(
            'SELECT current_cash, starting_capital FROM users WHERE id = ?',
            [userId]
        );
        
        const cashBalance = users[0].current_cash;
        const startingCapital = users[0].starting_capital;
        const totalStockValue = portfolioWithPrices.reduce((sum, h) => sum + h.currentValue, 0);
        const totalPortfolioValue = totalStockValue + parseFloat(cashBalance);
        const totalProfitLoss = totalPortfolioValue - startingCapital;
        const totalProfitLossPercent = (totalProfitLoss / startingCapital) * 100;
        
        res.json({
            success: true,
            portfolio: {
                holdings: portfolioWithPrices,
                cashBalance: parseFloat(cashBalance),
                totalStockValue: totalStockValue,
                totalPortfolioValue: totalPortfolioValue,
                startingCapital: parseFloat(startingCapital),
                totalProfitLoss: totalProfitLoss,
                totalProfitLossPercent: totalProfitLossPercent
            }
        });
        
    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({ error: 'Error fetching portfolio' });
    }
});

// Buy stock
router.post('/buy', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { ticker_symbol, shares, notes } = req.body;
        
        // Validation
        if (!ticker_symbol || !shares) {
            return res.status(400).json({ error: 'Ticker symbol and shares required' });
        }
        
        if (shares <= 0 || !Number.isInteger(shares)) {
            return res.status(400).json({ error: 'Shares must be a positive integer' });
        }
        
        // Get current stock price
        const quote = await getStockQuote(ticker_symbol);
        const totalCost = shares * quote.price;
        
        // Check if user has enough cash
        const [users] = await db.query(
            'SELECT current_cash FROM users WHERE id = ?',
            [userId]
        );
        
        const currentCash = parseFloat(users[0].current_cash);
        
        if (totalCost > currentCash) {
            return res.status(400).json({ 
                error: 'Insufficient funds',
                required: totalCost,
                available: currentCash
            });
        }
        
        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // Record transaction
            await connection.query(
                `INSERT INTO transactions 
                (user_id, ticker_symbol, company_name, transaction_type, shares, price_per_share, total_amount, transaction_date, notes)
                VALUES (?, ?, ?, 'BUY', ?, ?, ?, CURDATE(), ?)`,
                [userId, ticker_symbol.toUpperCase(), quote.symbol, shares, quote.price, totalCost, notes || null]
            );
            
            // Update or create portfolio holding
            const [existingHolding] = await connection.query(
                'SELECT * FROM portfolio_holdings WHERE user_id = ? AND ticker_symbol = ?',
                [userId, ticker_symbol.toUpperCase()]
            );
            
            if (existingHolding.length > 0) {
                // Update existing holding (calculate new average cost)
                const holding = existingHolding[0];
                const totalShares = holding.total_shares + shares;
                const totalCostBasis = (holding.total_shares * holding.average_cost_per_share) + totalCost;
                const newAverageCost = totalCostBasis / totalShares;
                
                await connection.query(
                    `UPDATE portfolio_holdings 
                    SET total_shares = ?, average_cost_per_share = ?
                    WHERE user_id = ? AND ticker_symbol = ?`,
                    [totalShares, newAverageCost, userId, ticker_symbol.toUpperCase()]
                );
            } else {
                // Create new holding
                await connection.query(
                    `INSERT INTO portfolio_holdings 
                    (user_id, ticker_symbol, company_name, total_shares, average_cost_per_share)
                    VALUES (?, ?, ?, ?, ?)`,
                    [userId, ticker_symbol.toUpperCase(), quote.symbol, shares, quote.price]
                );
            }
            
            // Update user's cash balance
            await connection.query(
                'UPDATE users SET current_cash = current_cash - ? WHERE id = ?',
                [totalCost, userId]
            );
            
            await connection.commit();
            
            res.json({ 
                success: true, 
                message: 'Stock purchased successfully',
                transaction: {
                    ticker: ticker_symbol.toUpperCase(),
                    shares: shares,
                    price: quote.price,
                    total: totalCost
                }
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Buy stock error:', error);
        res.status(500).json({ error: 'Error purchasing stock' });
    }
});

// Sell stock
router.post('/sell', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { ticker_symbol, shares, notes } = req.body;
        
        // Validation
        if (!ticker_symbol || !shares) {
            return res.status(400).json({ error: 'Ticker symbol and shares required' });
        }
        
        if (shares <= 0 || !Number.isInteger(shares)) {
            return res.status(400).json({ error: 'Shares must be a positive integer' });
        }
        
        // Check if user owns this stock
        const [holdings] = await db.query(
            'SELECT * FROM portfolio_holdings WHERE user_id = ? AND ticker_symbol = ?',
            [userId, ticker_symbol.toUpperCase()]
        );
        
        if (holdings.length === 0) {
            return res.status(400).json({ error: 'You do not own this stock' });
        }
        
        const holding = holdings[0];
        
        if (shares > holding.total_shares) {
            return res.status(400).json({ 
                error: 'Insufficient shares',
                requested: shares,
                available: holding.total_shares
            });
        }
        
        // Get current stock price
        const quote = await getStockQuote(ticker_symbol);
        const totalProceeds = shares * quote.price;
        
        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // Record transaction
            await connection.query(
                `INSERT INTO transactions 
                (user_id, ticker_symbol, company_name, transaction_type, shares, price_per_share, total_amount, transaction_date, notes)
                VALUES (?, ?, ?, 'SELL', ?, ?, ?, CURDATE(), ?)`,
                [userId, ticker_symbol.toUpperCase(), holding.company_name, shares, quote.price, totalProceeds, notes || null]
            );
            
            // Update portfolio holding
            const remainingShares = holding.total_shares - shares;
            
            if (remainingShares === 0) {
                // Remove holding entirely
                await connection.query(
                    'DELETE FROM portfolio_holdings WHERE user_id = ? AND ticker_symbol = ?',
                    [userId, ticker_symbol.toUpperCase()]
                );
            } else {
                // Update share count (average cost stays the same)
                await connection.query(
                    'UPDATE portfolio_holdings SET total_shares = ? WHERE user_id = ? AND ticker_symbol = ?',
                    [remainingShares, userId, ticker_symbol.toUpperCase()]
                );
            }
            
            // Update user's cash balance
            await connection.query(
                'UPDATE users SET current_cash = current_cash + ? WHERE id = ?',
                [totalProceeds, userId]
            );
            
            // Calculate realized gain/loss
            const costBasis = shares * holding.average_cost_per_share;
            const realizedGain = totalProceeds - costBasis;
            
            await connection.commit();
            
            res.json({ 
                success: true, 
                message: 'Stock sold successfully',
                transaction: {
                    ticker: ticker_symbol.toUpperCase(),
                    shares: shares,
                    price: quote.price,
                    total: totalProceeds,
                    realizedGain: realizedGain
                }
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Sell stock error:', error);
        res.status(500).json({ error: 'Error selling stock' });
    }
});

module.exports = router;