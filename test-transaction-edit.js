// Test transaction editing functionality
const http = require('http');
const fs = require('fs');

// Test data - simulating FormData
const testData = {
    type: 'expense',
    amount: '25.99',
    date: new Date().toISOString(),
    categoryId: '68cd91dd5c3f3cdda0066b69', // You may need to update this with a valid category ID
    notes: 'Updated test transaction',
    recurringType: 'none',
    tags: JSON.stringify(['updated', 'test'])
};

function makeRequest(method, path, data, token) {
    return new Promise((resolve, reject) => {
        // Convert data to form-urlencoded format
        const postData = new URLSearchParams(data).toString();
        
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

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
        req.write(postData);
        req.end();
    });
}

async function testTransactionEdit() {
    console.log('🧪 Testing Transaction Edit Functionality...');
    
    try {
        // Test without authentication (should fail with 401)
        const result = await makeRequest('PUT', '/api/transactions/test-id', testData);
        
        console.log(`Status: ${result.status}`);
        console.log('Response:', JSON.stringify(result.data, null, 2));
        
        if (result.status === 401) {
            console.log('✅ Authentication properly required for transaction updates');
        } else {
            console.log('❌ Unexpected response');
        }
        
    } catch (error) {
        console.error('Request error:', error.message);
    }
}

testTransactionEdit();