const express = require('express');
const router = express.Router();
const EmailPreferences = require('../models/emailPreferences.model');
const { auth } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

// Get user's email preferences
router.get('/preferences', auth, async (req, res) => {
    try {
        let preferences = await EmailPreferences.findByUserId(req.user.id);
        
        if (!preferences) {
            // Create default preferences if none exist
            preferences = EmailPreferences.getDefaultPreferences(req.user.id);
            await preferences.save();
        }

        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('Error fetching email preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch email preferences'
        });
    }
});

// Update user's email preferences
router.put('/preferences', auth, async (req, res) => {
    try {
        const {
            transactionNotifications,
            budgetAlerts,
            reports,
            accountEmails,
            marketing,
            emailFormat,
            timezone
        } = req.body;

        let preferences = await EmailPreferences.findByUserId(req.user.id);
        
        if (!preferences) {
            preferences = EmailPreferences.getDefaultPreferences(req.user.id);
        }

        // Update preferences
        if (transactionNotifications) {
            preferences.transactionNotifications = {
                ...preferences.transactionNotifications,
                ...transactionNotifications
            };
        }

        if (budgetAlerts) {
            preferences.budgetAlerts = {
                ...preferences.budgetAlerts,
                ...budgetAlerts
            };
        }

        if (reports) {
            preferences.reports = {
                ...preferences.reports,
                ...reports
            };
        }

        if (accountEmails) {
            preferences.accountEmails = {
                ...preferences.accountEmails,
                ...accountEmails
            };
        }

        if (marketing) {
            preferences.marketing = {
                ...preferences.marketing,
                ...marketing
            };
        }

        if (emailFormat) {
            preferences.emailFormat = emailFormat;
        }

        if (timezone) {
            preferences.timezone = timezone;
        }

        await preferences.save();

        res.json({
            success: true,
            message: 'Email preferences updated successfully',
            data: preferences
        });
    } catch (error) {
        console.error('Error updating email preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update email preferences'
        });
    }
});

// Test email functionality
router.post('/test', auth, async (req, res) => {
    try {
        const { emailType } = req.body;
        const userId = req.user.id;

        let result;
        
        switch (emailType) {
            case 'welcome':
                result = await NotificationService.sendWelcomeEmail(userId);
                break;
                
            case 'weekly-report':
                result = await NotificationService.generateWeeklyReport(userId);
                break;
                
            case 'monthly-report':
                const now = new Date();
                result = await NotificationService.generateMonthlyReport(
                    userId, 
                    now.getMonth() + 1, 
                    now.getFullYear()
                );
                break;
                
            case 'personalized-tips':
                result = await NotificationService.sendPersonalizedTips(userId);
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email type'
                });
        }

        res.json({
            success: true,
            message: `Test ${emailType} email sent successfully`,
            data: result
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send test email'
        });
    }
});

// Unsubscribe from all emails
router.post('/unsubscribe', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Unsubscribe token is required'
            });
        }

        const preferences = await EmailPreferences.findByUnsubscribeToken(token);
        
        if (!preferences) {
            return res.status(404).json({
                success: false,
                error: 'Invalid unsubscribe token'
            });
        }

        // Disable all email notifications
        preferences.transactionNotifications.enabled = false;
        preferences.budgetAlerts.enabled = false;
        preferences.reports.weekly.enabled = false;
        preferences.reports.monthly.enabled = false;
        preferences.marketing.newsletter = false;
        preferences.marketing.financialTips = false;
        preferences.marketing.productUpdates = false;
        preferences.marketing.personalizedInsights = false;

        await preferences.save();

        res.json({
            success: true,
            message: 'Successfully unsubscribed from all email notifications'
        });
    } catch (error) {
        console.error('Error unsubscribing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unsubscribe'
        });
    }
});

// Unsubscribe from specific email type
router.post('/unsubscribe/:type', async (req, res) => {
    try {
        const { token } = req.body;
        const { type } = req.params;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Unsubscribe token is required'
            });
        }

        const preferences = await EmailPreferences.findByUnsubscribeToken(token);
        
        if (!preferences) {
            return res.status(404).json({
                success: false,
                error: 'Invalid unsubscribe token'
            });
        }

        // Disable specific email type
        switch (type) {
            case 'transactions':
                preferences.transactionNotifications.enabled = false;
                break;
            case 'budgets':
                preferences.budgetAlerts.enabled = false;
                break;
            case 'reports':
                preferences.reports.weekly.enabled = false;
                preferences.reports.monthly.enabled = false;
                break;
            case 'newsletter':
                preferences.marketing.newsletter = false;
                break;
            case 'tips':
                preferences.marketing.financialTips = false;
                preferences.marketing.personalizedInsights = false;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email type'
                });
        }

        await preferences.save();

        res.json({
            success: true,
            message: `Successfully unsubscribed from ${type} emails`
        });
    } catch (error) {
        console.error('Error unsubscribing from specific type:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unsubscribe'
        });
    }
});

// Get email delivery statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const preferences = await EmailPreferences.findByUserId(req.user.id);
        
        if (!preferences) {
            return res.json({
                success: true,
                data: {
                    lastEmailSent: null,
                    failedDeliveries: 0,
                    isBlacklisted: false
                }
            });
        }

        res.json({
            success: true,
            data: {
                lastEmailSent: preferences.deliveryStatus.lastEmailSent,
                failedDeliveries: preferences.deliveryStatus.failedDeliveries,
                lastFailure: preferences.deliveryStatus.lastFailure,
                isBlacklisted: preferences.deliveryStatus.isBlacklisted
            }
        });
    } catch (error) {
        console.error('Error fetching email stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch email statistics'
        });
    }
});

// Reset email blacklist status (admin only)
router.post('/reset-blacklist', auth, async (req, res) => {
    try {
        const preferences = await EmailPreferences.findByUserId(req.user.id);
        
        if (!preferences) {
            return res.status(404).json({
                success: false,
                error: 'Email preferences not found'
            });
        }

        preferences.deliveryStatus.isBlacklisted = false;
        preferences.deliveryStatus.failedDeliveries = 0;
        preferences.deliveryStatus.lastFailure = undefined;
        
        await preferences.save();

        res.json({
            success: true,
            message: 'Email blacklist status reset successfully'
        });
    } catch (error) {
        console.error('Error resetting blacklist:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset blacklist status'
        });
    }
});

module.exports = router;