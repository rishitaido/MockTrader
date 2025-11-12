// Check authentication
checkAuth();

let portfolioData = null;

// Load portfolio
async function loadPortfolio() {
    try {
        const response = await fetch('/api/stocks/portfolio');
        const data = await response.json();
        
        if (data.success) {
            portfolioData = data.portfolio;
            updateSummary(portfolioData);
            displayHoldings(portfolioData.holdings);
        } else {
            console.error('Error loading portfolio:', data.error);
        }
    } catch (error) {
        console.error('Error loading portfolio:', error);
    }
}

// Update summary cards
function updateSummary(portfolio) {
    document.getElementById('total-value').textContent = formatCurrency(portfolio.totalPortfolioValue);
    document.getElementById('cash-balance').textContent = formatCurrency(portfolio.cashBalance);
    document.getElementById('stock-value').textContent = formatCurrency(portfolio.totalStockValue);
    document.getElementById('total-pl').textContent = formatCurrency(portfolio.totalProfitLoss);
    
    const plPercent = document.getElementById('total-pl-percent');
    plPercent.textContent = formatPercent(portfolio.totalProfitLossPercent);
    plPercent.className = portfolio.totalProfitLoss >= 0 ? 'change positive' : 'change negative';
}

// Display holdings table
function displayHoldings(holdings) {
    const tbody = document.getElementById('holdings-body');
    const noHoldings = document.getElementById('no-holdings');
    const table = document.getElementById('holdings-table');
    
    if (holdings.length === 0) {
        table.style.display = 'none';
        noHoldings.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    noHoldings.style.display = 'none';
    
    tbody.innerHTML = holdings.map(holding => `
        <tr>
            <td>
                <strong>${holding.ticker_symbol}</strong><br>
                <small>${holding.company_name || ''}</small>
            </td>
            <td>${holding.total_shares}</td>
            <td>${formatCurrency(holding.average_cost_per_share)}</td>
            <td>
                ${formatCurrency(holding.currentPrice)}
                ${holding.dayChange !== undefined ? `
                    <br><small class="${holding.dayChange >= 0 ? 'positive' : 'negative'}">
                        ${holding.dayChange >= 0 ? '+' : ''}${holding.dayChange.toFixed(2)} 
                        (${holding.dayChangePercent >= 0 ? '+' : ''}${holding.dayChangePercent.toFixed(2)}%)
                    </small>
                ` : ''}
            </td>
            <td>${formatCurrency(holding.currentValue)}</td>
            <td class="${holding.profitLoss >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(holding.profitLoss)}
            </td>
            <td class="${holding.profitLoss >= 0 ? 'positive' : 'negative'}">
                ${formatPercent(holding.profitLossPercent)}
            </td>
            <td>
                <a href="sell-stock.html?ticker=${holding.ticker_symbol}" class="btn btn-sm btn-secondary">Sell</a>
                <a href="stock-detail.html?ticker=${holding.ticker_symbol}" class="btn btn-sm btn-link">Details</a>
            </td>
        </tr>
    `).join('');
}

// Refresh prices
document.getElementById('refresh-btn').addEventListener('click', async () => {
    const btn = document.getElementById('refresh-btn');
    btn.textContent = 'Refreshing...';
    btn.disabled = true;
    
    await loadPortfolio();
    
    btn.textContent = '↻ Refresh Prices';
    btn.disabled = false;
});

// Logout
document.getElementById('logout-btn').addEventListener('click', logout);

// Load portfolio on page load
loadPortfolio();