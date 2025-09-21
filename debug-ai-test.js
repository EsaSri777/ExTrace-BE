const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Transaction, Category, User } = require('./src/models');
const aiController = require('./src/controllers/ai.controller');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const debugTest = async () => {
    try {
        await connectDB();
        
        // Get a real user for testing
        const users = await User.find().limit(1);
        if (users.length === 0) {
            console.log('❌ No users found in database');
            process.exit(1);
        }
        
        const testUser = users[0];
        console.log('👤 Test user found:', testUser._id, testUser.email);
        
        // Mock request object
        const req = {
            user: { _id: testUser._id },
            body: { period: 'month' }
        };
        
        // Mock response object
        const res = {
            json: (data) => {
                console.log('✅ Response:', JSON.stringify(data, null, 2));
            },
            status: (code) => {
                console.log(`📊 Status Code: ${code}`);
                return {
                    json: (data) => {
                        console.log('❌ Error Response:', JSON.stringify(data, null, 2));
                    }
                };
            }
        };
        
        console.log('\n🔍 Testing analyzeSpendingPatterns...');
        await aiController.analyzeSpendingPatterns(req, res);
        
        console.log('\n🔍 Testing predictBudget...');
        await aiController.predictBudget(req, res);
        
        console.log('\n🔍 Testing calculateFinancialHealthScore...');
        await aiController.calculateFinancialHealthScore(req, res);
        
        console.log('\n🔍 Testing getRecommendations...');
        await aiController.getRecommendations(req, res);
        
    } catch (error) {
        console.error('❌ Test error:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
};

debugTest();