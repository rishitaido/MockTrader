// Check authentication on page load
checkAuth();

// Load dashboard data
async function loadDashboard() {
    try {
        // Load portfolio
        const portfolioResponse = await fetch('/api/stocks/portfolio');
        const portfolioData = await portfolioResponse.json();
        
        if (portfolioData.success) {
            updatePortfolioSummary(portfolioData.portfolio);
            displayHoldingsPreview(portfolioData.portfolio.holdings);
        }
        
        // Load recent transactions
        const transactionsResponse = await fetch('/api/transactions?limit=5');
        const transactionsData = await transactionsResponse.json();
        
        if (transactionsData.success) {
            displayRecentTransactions(transactionsData.transactions);
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Update portfolio summary cards
function updatePortfolioSummary(portfolio) {
    document.getElementById('total-value').textContent = formatCurrency(portfolio.totalPortfolioValue);
    document.getElementById('cash-balance').textContent = formatCurrency(portfolio.cashBalance);
    document.getElementById('stock-value').textContent = formatCurrency(portfolio.totalStockValue);
    document.getElementById('total-pl').textContent = formatCurrency(portfolio.totalProfitLoss);
    
    const plElement = document.getElementById('total-pl');
    const changeElement = document.getElementById('total-change');
    const plPercentElement = document.getElementById('total-pl-percent');
    
    if (portfolio.totalProfitLoss >= 0) {
        plElement.classList.add('positive');
        plElement.classList.remove('negative');
    } else {
        plElement.classList.add('negative');
        plElement.classList.remove('positive');
    }
    
    changeElement.textContent = `${formatCurrency(portfolio.totalProfitLoss)} (${formatPercent(portfolio.totalProfitLossPercent)})`;
    changeElement.className = portfolio.totalProfitLoss >= 0 ? 'change positive' : 'change negative';
    
    plPercentElement.textContent = formatPercent(portfolio.totalProfitLossPercent);
    plPercentElement.className = portfolio.totalProfitLoss >= 0 ? 'change positive' : 'change negative';
}

// Display holdings preview
function displayHoldingsPreview(holdings) {
    const container = document.getElementById('holdings-preview');
    
    if (holdings.length === 0) {
        container.innerHTML = '<p>No stocks in portfolio. <a href="buy-stock.html">Buy your first stock!</a></p>';
        return;
    }
    
    const html = `
        <table class="preview-table">
            <thead>
                <tr>
                    <th>Stock</th>
                    <th>Shares</th>
                    <th>Current Price</th>
                    <th>Value</th>
                    <th>P/L</th>
                </tr>
            </thead>
            <tbody>
                ${holdings.slice(0, 5).map(holding => `
                    <tr>
                        <td><strong>${holding.ticker_symbol}</strong></td>
                        <td>${holding.total_shares}</td>
                        <td>${formatCurrency(holding.currentPrice)}</td>
                        <td>${formatCurrency(holding.currentValue)}</td>
                        <td class="${holding.profitLoss >= 0 ? 'positive' : 'negative'}">
                            ${formatCurrency(holding.profitLoss)}
                            (${formatPercent(holding.profitLossPercent)})
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${holdings.length > 5 ? '<a href="portfolio.html" class="btn btn-link">View All Holdings</a>' : ''}
    `;
    
    container.innerHTML = html;
}

// Display recent transactions
function displayRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p>No transactions yet.</p>';
        return;
    }
    
    const html = `
        <table class="preview-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Stock</th>
                    <th>Shares</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(tx => `
                    <tr>
                        <td>${new Date(tx.transaction_date).toLocaleDateString()}</td>
                        <td><span class="badge badge-${tx.transaction_type.toLowerCase()}">${tx.transaction_type}</span></td>
                        <td><strong>${tx.ticker_symbol}</strong></td>
                        <td>${tx.shares}</td>
                        <td>${formatCurrency(tx.price_per_share)}</td>
                        <td class="${tx.transaction_type === 'BUY' ? 'negative' : 'positive'}">
                            ${tx.transaction_type === 'BUY' ? '-' : '+'}${formatCurrency(tx.total_amount)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Logout handler
document.getElementById('logout-btn').addEventListener('click', logout);

// Load dashboard on page load
loadDashboard();