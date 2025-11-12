// Login form handler
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Clear previous errors
        document.getElementById('login-error').textContent = '';
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.location.href = 'dashboard.html';
            } else {
                document.getElementById('login-error').textContent = data.error || 'Login failed';
            }
        } catch (error) {
            document.getElementById('login-error').textContent = 'Connection error. Please try again.';
        }
    });
}

// Signup form handler
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Clear previous errors
        document.getElementById('signup-error').textContent = '';
        
        // Validation
        if (username.length < 3) {
            document.getElementById('signup-error').textContent = 'Username must be at least 3 characters';
            return;
        }
        
        if (password.length < 6) {
            document.getElementById('signup-error').textContent = 'Password must be at least 6 characters';
            return;
        }
        
        if (password !== confirmPassword) {
            document.getElementById('signup-error').textContent = 'Passwords do not match';
            return;
        }
        
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.location.href = 'dashboard.html';
            } else {
                document.getElementById('signup-error').textContent = data.error || 'Signup failed';
            }
        } catch (error) {
            document.getElementById('signup-error').textContent = 'Connection error. Please try again.';
        }
    });
}