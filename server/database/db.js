const mysql = require('mysql2');
require('dotenv').config(); 

//Create Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_NAME || 'stock_trading', 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

//Promisify for async/await
const promisPool = pool.promise(); 

pool.getConnection((err, connection) => {
    if(err){
        console.error('Error Connecting to DB: ', err);
        return;
    }
    console.log("DB connected!");
    connection.release();
});

module.exports = promisPool; 