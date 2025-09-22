const emailService = require('./src/services/emailService');

// Simple template test
console.log('Testing email service templates...');

// Give it a moment to initialize
setTimeout(() => {
    console.log('Available templates:', Object.keys(emailService.templates));
    
    // Test template loading
    try {
        const testData = {
            userName: 'Test User',
            appName: 'EXTrace',
            startDate: '2025-09-15',
            endDate: '2025-09-22',
            totalExpenses: '1,250.75',
            totalIncome: '2,500.00',
            netAmount: '1,249.25',
            isNetPositive: true,
            transactionCount: 15,
            topCategories: [
                { name: 'Groceries', amount: '450.50' },
                { name: 'Transportation', amount: '275.25' },
                { name: 'Entertainment', amount: '125.00' }
            ],
            hasInsights: true,
            insights: [
                'Your grocery spending increased by 15% this week',
                'You saved $50 compared to last week on transportation',
                'Your entertainment spending is within budget'
            ],
            dashboardUrl: 'http://localhost:4200/dashboard',
            reportsUrl: 'http://localhost:4200/reports',
            preferencesUrl: 'http://localhost:4200/settings',
            unsubscribeUrl: 'http://localhost:5000/api/email/unsubscribe/abc123'
        };
        
        emailService.sendEmail(
            'test@example.com',
            'Weekly Expense Report - Test',
            'weekly-report',
            testData
        ).then(() => {
            console.log('✅ Weekly report template test successful!');
            process.exit(0);
        }).catch(error => {
            console.error('❌ Weekly report template test failed:', error.message);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('Template test error:', error.message);
        process.exit(1);
    }
}, 2000);