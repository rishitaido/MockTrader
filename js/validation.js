// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = 'index.html';
            return false;
        }
        
        // Update username display if element exists
        const usernameDisplay = document.getElementById('username-display');
        const userName = document.getElementById('user-name');
        
        if (usernameDisplay) {
            usernameDisplay.textContent = data.username;
        }
        
        if (userName) {
            userName.textContent = data.username;
        }
        
        return true;
    } catch (error) {
        window.location.href = 'index.html';
        return false;
    }
}

// Logout function
async function logout(e) {
    if (e) e.preventDefault();
    
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'index.html';
    }
}

// Validate ticker symbol format
function validateTickerSymbol(ticker) {
    // 1-5 uppercase letters
    const tickerRegex = /^[A-Z]{1,5}$/;
    return tickerRegex.test(ticker);
}

// Validate positive integer
function validatePositiveInteger(value) {
    const num = parseInt(value);
    return Number.isInteger(num) && num > 0;
}

// Validate positive number (allows decimals)
function validatePositiveNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
}

// Show error message
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// Show success message
function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// Clear all messages
function clearMessages() {
    const errorElements = document.querySelectorAll('.error-message');
    const successElements = document.querySelectorAll('.success-message');
    
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    
    successElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format percentage
function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}