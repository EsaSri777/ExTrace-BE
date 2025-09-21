// Test AI endpoints with proper authentication
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// You'll need to get a real JWT token from your app
// You can get this from browser dev tools -> Application -> Local Storage -> token
// Or from the login response
const TEST_TOKEN = 'your-jwt-token-here';

async function testAIEndpoints() {
    console.log('🧪 Testing AI endpoints with authentication...');
    
    const headers = {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
    };
    
    try {
        // Test debug endpoint first
        console.log('\n1. Testing debug endpoint...');
        const debugResponse = await axios.post(`${BASE_URL}/ai/debug`, {}, { headers });
        console.log('✅ Debug response:', debugResponse.data);
        
        // Test spending analysis
        console.log('\n2. Testing spending analysis...');
        const spendingResponse = await axios.post(`${BASE_URL}/ai/analyze-spending`, {
            period: 'month'
        }, { headers });
        console.log('✅ Spending analysis:', spendingResponse.data);
        
    } catch (error) {
        if (error.response) {
            console.log('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.log('❌ Connection Error:', error.message);
            console.log('💡 Make sure your backend server is running on port 5000');
            console.log('💡 Update TEST_TOKEN with a real JWT token');
        }
    }
}

// Test without auth first
async function testBasicEndpoints() {
    try {
        console.log('🔍 Testing basic endpoints...');
        
        // Test health endpoint
        const healthResponse = await axios.get(`${BASE_URL}/ai/debug/health`);
        console.log('✅ Health check:', healthResponse.data);
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Health check failed:', error.response.status, error.response.data);
        } else {
            console.log('❌ Server not running:', error.message);
        }
    }
}

async function main() {
    await testBasicEndpoints();
    
    if (TEST_TOKEN && TEST_TOKEN !== 'your-jwt-token-here') {
        await testAIEndpoints();
    } else {
        console.log('\n⚠️  To test authenticated endpoints:');
        console.log('1. Login to your app');
        console.log('2. Get JWT token from browser storage or network tab');
        console.log('3. Replace TEST_TOKEN in this script');
        console.log('4. Run this script again');
    }
}

main();