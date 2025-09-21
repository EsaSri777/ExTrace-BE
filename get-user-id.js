// Get a real user ID from the database
const mongoose = require('mongoose');
require('dotenv').config();

async function findUserId() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const { User } = require('./src/models');
        
        // Find the first user
        const users = await User.find().limit(5);
        
        if (users.length > 0) {
            console.log('\n👥 Found users:');
            users.forEach(user => {
                console.log(`- ID: ${user._id}, Email: ${user.email}, Name: ${user.name}`);
            });
            
            console.log(`\n📝 Update the test endpoint with this user ID:`);
            console.log(`req.user = { _id: '${users[0]._id}' };`);
            
        } else {
            console.log('❌ No users found. Please register a user first.');
        }
        
        mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
}

findUserId();