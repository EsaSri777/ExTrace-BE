// Test email sending
const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

// Test email endpoint
router.post('/test-email', async (req, res) => {
    try {
        // Wait for email service to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const testEmail = await emailService.sendEmail({
            to: 'test-recipient@example.com',
            subject: 'Test Email from EXTrace',
            template: 'welcome',
            data: {
                userName: 'Test User',
                appName: 'EXTrace'
            }
        });

        console.log('Test email sent successfully:', testEmail);
        res.json({ 
            success: true, 
            message: 'Test email sent successfully',
            messageId: testEmail.messageId,
            previewUrl: testEmail.previewUrl
        });
    } catch (error) {
        console.error('Test email failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;