// Test environment variables
require('dotenv').config();

console.log('Environment Variables Test:');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('Dashboard URL would be:', `${process.env.FRONTEND_URL}/dashboard`);

// Test welcome email template data
const templateData = {
    name: 'Test User',
    email: 'test@example.com',
    dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
    supportUrl: `${process.env.FRONTEND_URL}/support`
};

console.log('\nTemplate data for welcome email:');
console.log(JSON.stringify(templateData, null, 2));