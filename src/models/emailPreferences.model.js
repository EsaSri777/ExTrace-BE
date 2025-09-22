const mongoose = require('mongoose');

const emailPreferencesSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    
    // Transaction notifications
    transactionNotifications: {
        enabled: { type: Boolean, default: true },
        frequency: { 
            type: String, 
            enum: ['immediate', 'daily', 'weekly', 'never'], 
            default: 'immediate' 
        },
        minAmount: { type: Number, default: 0 }, // Only notify for transactions above this amount
        categories: [String] // Only notify for specific categories (empty means all)
    },
    
    // Budget alerts
    budgetAlerts: {
        enabled: { type: Boolean, default: true },
        thresholds: {
            warning: { type: Number, default: 75 }, // Alert at 75% of budget
            critical: { type: Number, default: 90 }, // Alert at 90% of budget
            exceeded: { type: Boolean, default: true } // Alert when budget exceeded
        }
    },
    
    // Reports
    reports: {
        weekly: { 
            enabled: { type: Boolean, default: true },
            dayOfWeek: { type: Number, default: 1 }, // 1 = Monday
            time: { type: String, default: '09:00' } // 24-hour format
        },
        monthly: { 
            enabled: { type: Boolean, default: true },
            dayOfMonth: { type: Number, default: 1 }, // 1st day of month
            time: { type: String, default: '09:00' }
        }
    },
    
    // Account-related emails
    accountEmails: {
        welcome: { type: Boolean, default: true },
        security: { type: Boolean, default: true }, // Login alerts, password changes
        passwordReset: { type: Boolean, default: true },
        emailVerification: { type: Boolean, default: true }
    },
    
    // Marketing and tips
    marketing: {
        newsletter: { type: Boolean, default: true },
        financialTips: { type: Boolean, default: true },
        productUpdates: { type: Boolean, default: true },
        personalizedInsights: { type: Boolean, default: true }
    },
    
    // General preferences
    emailFormat: {
        type: String,
        enum: ['html', 'text'],
        default: 'html'
    },
    
    timezone: {
        type: String,
        default: 'UTC'
    },
    
    // Unsubscribe token for one-click unsubscribe
    unsubscribeToken: {
        type: String,
        unique: true,
        sparse: true
    },
    
    // Email delivery status
    deliveryStatus: {
        lastEmailSent: Date,
        failedDeliveries: { type: Number, default: 0 },
        lastFailure: Date,
        isBlacklisted: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

// Index for efficient queries
emailPreferencesSchema.index({ userId: 1 });
emailPreferencesSchema.index({ unsubscribeToken: 1 });

// Generate unsubscribe token before saving
emailPreferencesSchema.pre('save', function(next) {
    if (!this.unsubscribeToken) {
        const crypto = require('crypto');
        this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
    }
    next();
});

// Methods
emailPreferencesSchema.methods.shouldSendTransactionNotification = function(transaction) {
    if (!this.transactionNotifications.enabled) return false;
    if (transaction.amount < this.transactionNotifications.minAmount) return false;
    if (this.transactionNotifications.categories.length > 0 && 
        !this.transactionNotifications.categories.includes(transaction.category)) return false;
    
    return true;
};

emailPreferencesSchema.methods.shouldSendBudgetAlert = function(percentage) {
    if (!this.budgetAlerts.enabled) return false;
    
    const thresholds = this.budgetAlerts.thresholds;
    
    if (percentage >= 100 && thresholds.exceeded) return { type: 'exceeded', send: true };
    if (percentage >= thresholds.critical) return { type: 'critical', send: true };
    if (percentage >= thresholds.warning) return { type: 'warning', send: true };
    
    return { type: 'none', send: false };
};

emailPreferencesSchema.methods.getReportSchedule = function(reportType) {
    const report = this.reports[reportType];
    if (!report || !report.enabled) return null;
    
    return {
        enabled: report.enabled,
        schedule: reportType === 'weekly' 
            ? { dayOfWeek: report.dayOfWeek, time: report.time }
            : { dayOfMonth: report.dayOfMonth, time: report.time }
    };
};

// Static methods
emailPreferencesSchema.statics.getDefaultPreferences = function(userId) {
    return new this({
        userId,
        transactionNotifications: {
            enabled: true,
            frequency: 'immediate',
            minAmount: 0,
            categories: []
        },
        budgetAlerts: {
            enabled: true,
            thresholds: {
                warning: 75,
                critical: 90,
                exceeded: true
            }
        },
        reports: {
            weekly: { enabled: true, dayOfWeek: 1, time: '09:00' },
            monthly: { enabled: true, dayOfMonth: 1, time: '09:00' }
        },
        accountEmails: {
            welcome: true,
            security: true,
            passwordReset: true,
            emailVerification: true
        },
        marketing: {
            newsletter: true,
            financialTips: true,
            productUpdates: true,
            personalizedInsights: true
        }
    });
};

emailPreferencesSchema.statics.findByUserId = function(userId) {
    return this.findOne({ userId });
};

emailPreferencesSchema.statics.findByUnsubscribeToken = function(token) {
    return this.findOne({ unsubscribeToken: token });
};

module.exports = mongoose.model('EmailPreferences', emailPreferencesSchema);