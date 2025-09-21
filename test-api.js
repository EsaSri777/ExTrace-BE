// Test AI API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testData = {
    description: 'Starbucks coffee',
    amount: 5.50,
    merchantInfo: 'Starbucks'
};

async function testAIEndpoints() {
    console.log('🧪 Testing AI API Endpoints...');
    
    try {
        // Test categorization endpoint
        console.log('1. Testing categorization...');
        const response = await axios.post(`${BASE_URL}/ai/categorize`, testData, {
            headers: {
                'Authorization': 'Bearer your-test-token-here',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Categorization response:', response.data);
        
    } catch (error) {
        if (error.response) {
            console.log('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.log('❌ Connection Error:', error.message);
            console.log('💡 Make sure your backend server is running on port 5000');
        }
    }
}

// Check if server is running
async function checkServer() {
    try {
        const response = await axios.get('http://localhost:5000');
        console.log('✅ Server is running');
        return true;
    } catch (error) {
        console.log('❌ Server is not running. Please start with: npm start');
        return false;
    }
}

async function main() {
    const serverRunning = await checkServer();
    if (serverRunning) {
        await testAIEndpoints();
    }
}

main();