const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Category, User } = require('./src/models');

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

const testCategoryIds = async () => {
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
        
        // Get categories for this user
        const categories = await Category.find({ userId: testUser._id });
        console.log('\n📂 Categories found:', categories.length);
        
        categories.forEach((cat, index) => {
            console.log(`${index + 1}. ${cat.name} (${cat.type})`);
            console.log(`   ID: ${cat._id}`);
            console.log(`   ID Type: ${typeof cat._id}`);
            console.log(`   Is Valid ObjectId: ${mongoose.Types.ObjectId.isValid(cat._id)}`);
            console.log('');
        });
        
        // Test ObjectId validation
        const testIds = [
            '68cd91dd5c3f3cdda0066b69', // Sample ID
            '', // Empty string
            'invalid-id', // Invalid format
            null, // Null
            undefined // Undefined
        ];
        
        console.log('🧪 Testing ObjectId validation:');
        testIds.forEach(id => {
            const isValid = id ? mongoose.Types.ObjectId.isValid(id) : false;
            const regex = id ? /^[0-9a-fA-F]{24}$/.test(id) : false;
            console.log(`ID: "${id}" | isValid: ${isValid} | Regex: ${regex}`);
        });
        
    } catch (error) {
        console.error('❌ Test error:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
};

testCategoryIds();