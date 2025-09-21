// Direct debug of AI functions
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function directTest() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const { Transaction, Category, User } = require('./src/models');
        const userId = '68cd91dd5c3f3cdda0066b69';
        
        console.log('\n👤 Testing user lookup...');
        const user = await User.findById(userId);
        console.log('User found:', user ? `${user.name} (${user.email})` : 'Not found');
        
        console.log('\n📊 Testing transaction query...');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        
        console.log('Date range:', startDate, 'to', endDate);
        
        const transactions = await Transaction.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).populate('categoryId');
        
        console.log('Transactions found:', transactions.length);
        if (transactions.length > 0) {
            console.log('Sample transaction:', {
                amount: transactions[0].amount,
                type: transactions[0].type,
                category: transactions[0].categoryId?.name || 'No category',
                date: transactions[0].date
            });
        }
        
        console.log('\n🧠 Testing AI service...');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent('Say "Hello AI test!" in JSON format: {"message": "Hello AI test!"}');
        const response = await result.response;
        const text = response.text();
        console.log('AI response:', text);
        
        console.log('\n🎯 Testing spending calculation...');
        const categorySpending = {};
        let totalSpending = 0;

        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const categoryName = transaction.categoryId?.name || 'Uncategorized';
                categorySpending[categoryName] = (categorySpending[categoryName] || 0) + transaction.amount;
                totalSpending += transaction.amount;
            }
        });
        
        console.log('Category spending:', categorySpending);
        console.log('Total spending:', totalSpending);
        
        if (totalSpending > 0) {
            const topCategories = Object.entries(categorySpending)
                .map(([category, amount]) => ({
                    category,
                    percentage: Math.round((amount / totalSpending) * 100)
                }))
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 5);
            
            console.log('Top categories:', topCategories);
        } else {
            console.log('⚠️ No expenses found for this user in the last month');
        }
        
        mongoose.disconnect();
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

directTest();