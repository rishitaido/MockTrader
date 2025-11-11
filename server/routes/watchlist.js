const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getStockQuote } = require('../utils/stockAPI');

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}

// Get all watchlists for user
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const [watchlists] = await db.query(
            'SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        // Get stocks for each watchlist
        const watchlistsWithStocks = await Promise.all(
            watchlists.map(async (watchlist) => {
                const [stocks] = await db.query(
                    'SELECT * FROM watchlist_stocks WHERE watchlist_id = ?',
                    [watchlist.id]
                );
                
                return {
                    ...watchlist,
                    stocks: stocks
                };
            })
        );
        
        res.json({ success: true, watchlists: watchlistsWithStocks });
        
    } catch (error) {
        console.error('Get watchlists error:', error);
        res.status(500).json({ error: 'Error fetching watchlists' });
    }
});

// Create new watchlist
router.post('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Watchlist name required' });
        }
        
        const [result] = await db.query(
            'INSERT INTO watchlists (user_id, name) VALUES (?, ?)',
            [userId, name.trim()]
        );
        
        res.json({ 
            success: true, 
            message: 'Watchlist created',
            watchlistId: result.insertId
        });
        
    } catch (error) {
        console.error('Create watchlist error:', error);
        res.status(500).json({ error: 'Error creating watchlist' });
    }
});

// Add stock to watchlist
router.post('/:id/stocks', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { id } = req.params;
        const { ticker_symbol, notes } = req.body;
        
        if (!ticker_symbol) {
            return res.status(400).json({ error: 'Ticker symbol required' });
        }
        
        // Verify watchlist belongs to user
        const [watchlists] = await db.query(
            'SELECT * FROM watchlists WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (watchlists.length === 0) {
            return res.status(404).json({ error: 'Watchlist not found' });
        }
        
        // Get stock info
        const quote = await getStockQuote(ticker_symbol);
        
        // Add to watchlist
        await db.query(
            `INSERT INTO watchlist_stocks (watchlist_id, ticker_symbol, company_name, notes)
            VALUES (?, ?, ?, ?)`,
            [id, ticker_symbol.toUpperCase(), quote.symbol, notes || null]
        );
        
        res.json({ success: true, message: 'Stock added to watchlist' });
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Stock already in watchlist' });
        }
        console.error('Add to watchlist error:', error);
        res.status(500).json({ error: 'Error adding stock to watchlist' });
    }
});

// Remove stock from watchlist
router.delete('/:watchlistId/stocks/:stockId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { watchlistId, stockId } = req.params;
        
        // Verify watchlist belongs to user
        const [watchlists] = await db.query(
            'SELECT * FROM watchlists WHERE id = ? AND user_id = ?',
            [watchlistId, userId]
        );
        
        if (watchlists.length === 0) {
            return res.status(404).json({ error: 'Watchlist not found' });
        }
        
        // Remove stock
        await db.query(
            'DELETE FROM watchlist_stocks WHERE id = ? AND watchlist_id = ?',
            [stockId, watchlistId]
        );
        
        res.json({ success: true, message: 'Stock removed from watchlist' });
        
    } catch (error) {
        console.error('Remove from watchlist error:', error);
        res.status(500).json({ error: 'Error removing stock from watchlist' });
    }
});

// Delete watchlist
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { id } = req.params;
        
        // Verify watchlist belongs to user
        const [watchlists] = await db.query(
            'SELECT * FROM watchlists WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (watchlists.length === 0) {
            return res.status(404).json({ error: 'Watchlist not found' });
        }
        
        // Delete watchlist (cascade will delete stocks)
        await db.query(
            'DELETE FROM watchlists WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        res.json({ success: true, message: 'Watchlist deleted' });
        
    } catch (error) {
        console.error('Delete watchlist error:', error);
        res.status(500).json({ error: 'Error deleting watchlist' });
    }
});

module.exports = router;