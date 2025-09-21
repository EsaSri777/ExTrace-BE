const http = require('http');

// Test the AI categorization endpoint
function testCategorization() {
    const testData = {
        description: "Starbucks Coffee",
        amount: 5.99,
        merchantInfo: "Starbucks"
    };

    const postData = JSON.stringify(testData);
    
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/ai/categorize',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            // You'll need to add your JWT token here for authentication
            // 'Authorization': 'Bearer your-jwt-token-here'
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log(`Status: ${res.statusCode}`);
            try {
                const parsed = JSON.parse(body);
                console.log('Response:', JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log('Raw response:', body);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Request error:', error);
    });

    req.write(postData);
    req.end();
}

console.log('🧪 Testing AI Categorization...');
console.log('⚠️  Note: This will fail without proper JWT token');
testCategorization();