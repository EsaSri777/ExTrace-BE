// Test welcome email template compilation
require('dotenv').config();

const emailService = require('./src/services/emailService');

async function testWelcomeEmail() {
    console.log('Testing welcome email template...');
    
    const testUser = {
        name: 'Test User',
        email: 'test@example.com'
    };
    
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
    
    try {
        const result = await emailService.sendWelcomeEmail(testUser);
        console.log('Welcome email test result:', result);
    } catch (error) {
        console.error('Error testing welcome email:', error);
    }
}

testWelcomeEmail();