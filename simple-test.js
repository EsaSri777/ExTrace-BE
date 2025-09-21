// Simple test without external dependencies
const http = require('http');

// TO TEST WITH REAL AUTH:
// 1. Login to your frontend app (http://localhost:4200)
// 2. Open browser dev tools -> Application -> Local Storage
// 3. Copy the 'token' value and replace 'your-jwt-token-here' below
const JWT_TOKEN = 'your-jwt-token-here';

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testServer() {
    console.log('🔍 Testing server connection...');
    
    try {
        // Test basic server
        const health = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/ai/debug/health',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Health check:', health.status, health.data);
        
        // Test the new test endpoints without auth
        console.log('\n🧪 Testing AI endpoints (no auth required)...');
        
        const testSpending = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/ai/test/analyze-spending',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { period: 'month' });
        
        console.log('📊 Test spending analysis:', testSpending.status, JSON.stringify(testSpending.data, null, 2));
        
        const testBudget = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/ai/test/predict-budget',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {});
        
        console.log('💰 Test budget prediction:', testBudget.status, JSON.stringify(testBudget.data, null, 2));
        
        const testHealth = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/ai/test/health-score',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {});
        
        console.log('🏥 Test health score:', testHealth.status, JSON.stringify(testHealth.data, null, 2));
        
        const testRecommendations = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/ai/test/recommendations',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {});
        
        console.log('💡 Test recommendations:', testRecommendations.status, JSON.stringify(testRecommendations.data, null, 2));
        
        // Test with authentication if token is provided
        if (JWT_TOKEN && JWT_TOKEN !== 'your-jwt-token-here') {
            console.log('\n🔐 Testing with authentication...');
            
            // Test debug endpoint
            const debug = await makeRequest({
                hostname: 'localhost',
                port: 5000,
                path: '/api/ai/debug',
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${JWT_TOKEN}`
                }
            }, {});
            
            console.log('🐛 Debug endpoint:', debug.status, debug.data);
            
            // Test spending analysis with auth
            const spending = await makeRequest({
                hostname: 'localhost',
                port: 5000,
                path: '/api/ai/analyze-spending',
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${JWT_TOKEN}`
                }
            }, { period: 'month' });
            
            console.log('📊 Spending analysis (with auth):', spending.status, spending.data);
            
        } else {
            console.log('\n⚠️  To test authenticated endpoints:');
            console.log('1. Start your frontend: ng serve');
            console.log('2. Login at http://localhost:4200/auth/login');
            console.log('3. Open browser dev tools -> Application -> Local Storage');
            console.log('4. Copy the "token" value');
            console.log('5. Replace JWT_TOKEN in this script');
            console.log('6. Run this script again');
        }
        
    } catch (error) {
        console.log('❌ Server error:', error.message);
        console.log('💡 Make sure your backend server is running on port 5000');
    }
}

testServer();