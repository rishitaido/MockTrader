const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}

// Get all transactions for user
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { type, ticker, limit } = req.query;
        
        let query = 'SELECT * FROM transactions WHERE user_id = ?';
        let params = [userId];
        
        // Filter by transaction type
        if (type && (type === 'BUY' || type === 'SELL')) {
            query += ' AND transaction_type = ?';
            params.push(type);
        }
        
        // Filter by ticker
        if (ticker) {
            query += ' AND ticker_symbol = ?';
            params.push(ticker.toUpperCase());
        }
        
        query += ' ORDER BY transaction_date DESC, created_at DESC';
        
        // Limit results
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }
        
        const [transactions] = await db.query(query, params);
        
        res.json({ success: true, transactions });
        
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Error fetching transactions' });
    }
});

// Get single transaction
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { id } = req.params;
        
        const [transactions] = await db.query(
            'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (transactions.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        res.json({ success: true, transaction: transactions[0] });
        
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Error fetching transaction' });
    }
});

// Update transaction
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { id } = req.params;
        const { shares, price_per_share, transaction_date, notes } = req.body;
        
        // Get existing transaction
        const [existing] = await db.query(
            'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        const transaction = existing[0];
        
        // Validation
        if (shares && (shares <= 0 || !Number.isInteger(shares))) {
            return res.status(400).json({ error: 'Shares must be a positive integer' });
        }
        
        if (price_per_share && price_per_share <= 0) {
            return res.status(400).json({ error: 'Price must be positive' });
        }
        
        if (transaction_date && new Date(transaction_date) > new Date()) {
            return res.status(400).json({ error: 'Date cannot be in the future' });
        }
        
        // Calculate new total if shares or price changed
        const newShares = shares || transaction.shares;
        const newPrice = price_per_share || transaction.price_per_share;
        const newTotal = newShares * newPrice;
        
        // Update transaction
        await db.query(
            `UPDATE transactions 
            SET shares = ?, price_per_share = ?, total_amount = ?, transaction_date = ?, notes = ?
            WHERE id = ? AND user_id = ?`,
            [
                newShares,
                newPrice,
                newTotal,
                transaction_date || transaction.transaction_date,
                notes !== undefined ? notes : transaction.notes,
                id,
                userId
            ]
        );
        
        res.json({ success: true, message: 'Transaction updated successfully' });
        
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ error: 'Error updating transaction' });
    }
});

// Delete transaction
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { id } = req.params;
        
        // Check if transaction exists and belongs to user
        const [existing] = await db.query(
            'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        // Delete transaction
        await db.query(
            'DELETE FROM transactions WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        res.json({ success: true, message: 'Transaction deleted successfully' });
        
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'Error deleting transaction' });
    }
});

module.exports = router;