// Get a real user ID from the database
const mongoose = require('mongoose');
require('dotenv').config();

async function findUserId() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const { User } = require('./src/models');
        
        // Find the first user
        const users = await User.find().limit(5);
        mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
}

findUserId();