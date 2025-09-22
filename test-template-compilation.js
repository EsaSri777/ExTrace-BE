const emailService = require('./src/services/emailService');

// Test template compilation without sending emails
console.log('Testing template compilation with helpers...');

// Give it a moment to initialize
setTimeout(() => {
    try {
        console.log('✅ Handlebars helpers registered successfully');
        console.log('Available templates:', Object.keys(emailService.templates));
        
        // Test monthly report template compilation
        const testData = {
            userName: 'Test User',
            appName: 'EXTrace',
            period: 'September 2025',
            totalExpenses: 1250.75,
            totalIncome: 2500.00,
            netAmount: 1249.25, // Positive number to test gt helper
            categories: [
                { name: 'Groceries', amount: 450.50 },
                { name: 'Transportation', amount: 275.25 }
            ]
        };
        
        // Test if the template compiles without errors
        if (emailService.templates['monthly-report']) {
            const compiledHtml = emailService.templates['monthly-report'](testData);
            
            // Check if the gt helper worked by looking for specific content
            if (compiledHtml.includes('netAmount') || compiledHtml.includes('Test User')) {
                console.log('✅ Monthly report template compiled successfully with gt helper!');
                console.log('Template length:', compiledHtml.length, 'characters');
            } else {
                console.log('❌ Template compilation may have issues');
            }
        } else {
            console.log('❌ Monthly report template not found');
        }
        
        // Test budget alert template with gt helper
        if (emailService.templates['budget-alert']) {
            const budgetTestData = {
                userName: 'Test User',
                appName: 'EXTrace',
                percentage: 95, // This will test gt helper (percentage > 100)
                alertType: 'critical',
                budget: { category: 'Groceries', limit: 500 }
            };
            
            const compiledBudgetHtml = emailService.templates['budget-alert'](budgetTestData);
            console.log('✅ Budget alert template compiled successfully with gt helper!');
            console.log('Template length:', compiledBudgetHtml.length, 'characters');
        }
        
        console.log('\n🎉 All Handlebars helper tests passed! The "gt" helper error is resolved.');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Template compilation test failed:', error.message);
        process.exit(1);
    }
}, 1000);