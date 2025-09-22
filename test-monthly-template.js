const emailService = require('./src/services/emailService');

// Test monthly report template with gt helper
console.log('Testing monthly report template with helpers...');

// Give it a moment to initialize
setTimeout(() => {
    console.log('Available templates:', Object.keys(emailService.templates));
    
    // Test monthly report with netAmount > 0 (should trigger gt helper)
    try {
        const testData = {
            userName: 'Test User',
            appName: 'EXTrace',
            period: 'September 2025',
            totalExpenses: 1250.75,
            totalIncome: 2500.00,
            netAmount: 1249.25, // Positive number to test gt helper
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
        
        emailService.sendEmail(
            'test@example.com',
            'Monthly Financial Report - Test',
            'monthly-report',
            testData
        ).then((result) => {
            if (result.success) {
                console.log('✅ Monthly report template test successful!');
                console.log('Message ID:', result.messageId);
            } else {
                console.log('❌ Email sending failed:', result.error);
            }
            process.exit(0);
        }).catch(error => {
            console.error('❌ Monthly report template test failed:', error.message);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('Template test error:', error.message);
        process.exit(1);
    }
}, 2000);