// Debug AI endpoints
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

// Simple test route to check if basic functionality works
app.get('/test-db', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }
        
        const { Transaction, Category, User } = require('./src/models');
        
        // Test basic queries
        const userCount = await User.countDocuments();
        const transactionCount = await Transaction.countDocuments();
        const categoryCount = await Category.countDocuments();
        
        res.json({
            success: true,
            counts: {
                users: userCount,
                transactions: transactionCount,
                categories: categoryCount
            }
        });
        
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
});

// Test spending analysis with minimal logic
app.post('/test-spending', async (req, res) => {
    try {
        console.log('Testing spending analysis...');
        console.log('Request body:', req.body);
        
        // Mock user ID for testing - replace with actual authenticated user
        const userId = '66e9d123456789abcdef0123'; // Replace with a real user ID from your DB
        
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }
        
        const { Transaction } = require('./src/models');
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        
        console.log('Querying transactions for user:', userId);
        console.log('Date range:', startDate, 'to', endDate);
        
        const transactions = await Transaction.find({
            userId: userId,
            date: { $gte: startDate, $lte: endDate }
        }).populate('categoryId');
        
        console.log('Found transactions:', transactions.length);
        
        res.json({
            success: true,
            transactionCount: transactions.length,
            transactions: transactions.slice(0, 5), // First 5 for debugging
            dateRange: { start: startDate, end: endDate }
        });
        
    } catch (error) {
        console.error('Spending test error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Debug server running on port ${PORT}`);
    console.log('Test endpoints:');
    console.log(`- GET http://localhost:${PORT}/test-db`);
    console.log(`- POST http://localhost:${PORT}/test-spending`);
});