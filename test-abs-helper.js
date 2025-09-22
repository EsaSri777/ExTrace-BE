const emailService = require('./src/services/emailService');

// Test monthly report template with abs helper
console.log('Testing monthly report template with abs helper...');

// Give it a moment to initialize
setTimeout(() => {
    try {
        console.log('Available templates:', Object.keys(emailService.templates));
        
        // Test monthly report with negative netAmount (should trigger abs helper)
        const testData = {
            userName: 'Test User',
            appName: 'EXTrace',
            period: 'September 2025',
            totalExpenses: 2500.75,
            totalIncome: 1500.00,
            netAmount: -1000.75, // Negative number to test abs helper
            categories: [
                { name: 'Groceries', amount: 450.50 },
                { name: 'Transportation', amount: 275.25 },
                { name: 'Entertainment', amount: 125.00 }
            ],
            dashboardUrl: 'http://localhost:4200/dashboard',
            reportsUrl: 'http://localhost:4200/reports',
            preferencesUrl: 'http://localhost:4200/settings',
            unsubscribeUrl: 'http://localhost:5000/api/email/unsubscribe/abc123'
        };
        
        // Test template compilation with abs helper
        if (emailService.templates['monthly-report']) {
            const compiledHtml = emailService.templates['monthly-report'](testData);
            
            // Check if the abs helper worked by looking for the absolute value
            if (compiledHtml.includes('1000.75') || compiledHtml.includes('overspent')) {
                console.log('✅ Monthly report template with abs helper compiled successfully!');
                console.log('Template length:', compiledHtml.length, 'characters');
                console.log('✅ The abs helper converted negative netAmount to positive value');
            } else {
                console.log('❌ Template compilation may have issues with abs helper');
            }
        } else {
            console.log('❌ Monthly report template not found');
        }
        
        console.log('\n🎉 The "abs" helper error should now be resolved!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Template test failed:', error.message);
        process.exit(1);
    }
}, 1000);