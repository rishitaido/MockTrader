const express = require('express'); 
const session = require('express-session'); 
const path = require('path');
require('dotenv').config(); 

const app = express(); 
const PORT = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.urlencoded({extended: true})); 

//Session Config
app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false, 
    saveUninitialized: false,
    cookie: {
        secure: false, //Set true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 //24 hours
    }
})); 

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..')));

// Import routes
const authRoutes = require('./routes/auth');
const stocksRoutes = require('./routes/stocks');
const transactionsRoutes = require('./routes/transactions');
const watchlistRoutes = require('./routes/watchlist');

//Use routes 
app.use('/api/auth', authRoutes); 
app.use('/api/stocks', stocksRoutes); 
app.use('/api/transactions', transactionsRoutes);
app.use('/api/watchlist', watchlistRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html')); 
});

app.listen(PORT, () =>{
    console.log('Server running on http://localhost:${PORT}');
});