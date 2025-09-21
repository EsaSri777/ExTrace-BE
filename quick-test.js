const http = require('http');

function testEndpoint(path, data = {}) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: `/api/ai${path}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
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

async function quickTest() {
    try {
        console.log('🧪 Quick test of AI endpoints...\n');
        
        // Test spending analysis
        const spending = await testEndpoint('/test/analyze-spending', { period: 'month' });
        console.log('📊 Spending Analysis:', spending.status);
        if (spending.status === 200) {
            console.log('   ✅ SUCCESS - Got insights:', spending.data.insights?.length || 0);
        } else {
            console.log('   ❌ FAILED:', spending.data);
        }
        
        // Test budget prediction  
        const budget = await testEndpoint('/test/predict-budget', {});
        console.log('💰 Budget Prediction:', budget.status);
        if (budget.status === 200) {
            console.log('   ✅ SUCCESS - Prediction:', budget.data.nextMonthPrediction);
        } else {
            console.log('   ❌ FAILED:', budget.data);
        }
        
        // Test health score
        const health = await testEndpoint('/test/health-score', {});
        console.log('🏥 Health Score:', health.status);
        if (health.status === 200) {
            console.log('   ✅ SUCCESS - Score:', health.data.score);
        } else {
            console.log('   ❌ FAILED:', health.data);
        }
        
        // Test recommendations
        const recommendations = await testEndpoint('/test/recommendations', {});
        console.log('💡 Recommendations:', recommendations.status);
        if (recommendations.status === 200) {
            console.log('   ✅ SUCCESS - Got recommendations:', recommendations.data?.length || 0);
        } else {
            console.log('   ❌ FAILED:', recommendations.data);
        }
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

quickTest();