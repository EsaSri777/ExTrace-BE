const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Category, User } = require('./src/models');
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

const testCategorization = async () => {
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
            body: { 
                description: "Starbucks Coffee Shop",
                amount: 5.99,
                merchantInfo: "Starbucks"
            }
        };
        
        // Mock response object
        const res = {
            json: (data) => {
                console.log('✅ Categorization Response:', JSON.stringify(data, null, 2));
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
        
        console.log('\n🔍 Testing AI categorization...');
        await aiController.categorizeTransaction(req, res);
        
    } catch (error) {
        console.error('❌ Test error:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
};

testCategorization();