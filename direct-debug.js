// Direct debug of AI functions
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function directTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const { Transaction, Category, User } = require('./src/models');
        const userId = '68cd91dd5c3f3cdda0066b69';
        
        const user = await User.findById(userId);
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        
        
        const transactions = await Transaction.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).populate('categoryId');
        
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent('Say "Hello AI test!" in JSON format: {"message": "Hello AI test!"}');
        const response = await result.response;
        const text = response.text();
        
        const categorySpending = {};
        let totalSpending = 0;

        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const categoryName = transaction.categoryId?.name || 'Uncategorized';
                categorySpending[categoryName] = (categorySpending[categoryName] || 0) + transaction.amount;
                totalSpending += transaction.amount;
            }
        });
        
        if (totalSpending > 0) {
            const topCategories = Object.entries(categorySpending)
                .map(([category, amount]) => ({
                    category,
                    percentage: Math.round((amount / totalSpending) * 100)
                }))
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 5);
            
        } else {
            console.log('⚠️ No expenses found for this user in the last month');
        }
        
        mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

directTest();