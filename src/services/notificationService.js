const EmailService = require('./emailService');
const EmailPreferences = require('../models/emailPreferences.model');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const Category = require('../models/category.model');
const moment = require('moment');

class NotificationService {
    constructor() {
        this.emailService = EmailService;
        this.queue = [];
        this.processing = false;
    }

    // Transaction notifications
    async handleTransactionCreated(transactionId) {
        try {
            const transaction = await Transaction.findById(transactionId).populate('userId');
            if (!transaction) return;

            const user = transaction.userId;
            const preferences = await EmailPreferences.findByUserId(user._id);
            
            if (!preferences || !preferences.shouldSendTransactionNotification(transaction)) {
                return;
            }

            // Handle different notification frequencies
            switch (preferences.transactionNotifications.frequency) {
                case 'immediate':
                    await this.sendTransactionNotificationImmediate(user, transaction);
                    break;
                case 'daily':
                    await this.queueTransactionForDailyDigest(user, transaction);
                    break;
                case 'weekly':
                    await this.queueTransactionForWeeklyDigest(user, transaction);
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('Error handling transaction notification:', error);
        }
    }

    async sendTransactionNotificationImmediate(user, transaction) {
        try {
            const result = await this.emailService.sendTransactionNotification(user, transaction);
            await this.logEmailDelivery(user._id, 'transaction-notification', result);
        } catch (error) {
            console.error('Error sending immediate transaction notification:', error);
        }
    }

    // Budget alert notifications
    async checkBudgetAlerts(userId, categoryName) {
        try {
            const user = await User.findById(userId);
            const preferences = await EmailPreferences.findByUserId(userId);
            
            if (!user || !preferences || !preferences.budgetAlerts.enabled) {
                return;
            }

            // Get current month's spending for this category
            const startOfMonth = moment().startOf('month').toDate();
            const endOfMonth = moment().endOf('month').toDate();
            
            const spent = await Transaction.aggregate([
                {
                    $match: {
                        userId: userId,
                        category: categoryName,
                        type: 'expense',
                        date: { $gte: startOfMonth, $lte: endOfMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);

            const spentAmount = spent.length > 0 ? spent[0].total : 0;
            
            // Get budget limit for this category
            const category = await Category.findOne({ 
                userId: userId, 
                name: categoryName 
            });
            
            if (!category || !category.budgetLimit) {
                return;
            }

            const percentage = (spentAmount / category.budgetLimit) * 100;
            const alertCheck = preferences.shouldSendBudgetAlert(percentage);
            
            if (alertCheck.send) {
                const budget = {
                    category: categoryName,
                    limit: category.budgetLimit,
                    spent: spentAmount,
                    remaining: Math.max(0, category.budgetLimit - spentAmount),
                    overspent: Math.max(0, spentAmount - category.budgetLimit)
                };
                
                const result = await this.emailService.sendBudgetAlert(
                    user, 
                    budget, 
                    spentAmount, 
                    percentage
                );
                
                await this.logEmailDelivery(userId, 'budget-alert', result);
            }
        } catch (error) {
            console.error('Error checking budget alerts:', error);
        }
    }

    // Welcome email for new users
    async sendWelcomeEmail(userId) {
        try {
            const user = await User.findById(userId);
            const preferences = await EmailPreferences.findByUserId(userId);
            
            if (!user || !preferences?.accountEmails.welcome) {
                return;
            }

            const result = await this.emailService.sendWelcomeEmail(user);
            await this.logEmailDelivery(userId, 'welcome', result);
        } catch (error) {
            console.error('Error sending welcome email:', error);
        }
    }

    // Password reset email
    async sendPasswordResetEmail(userId, resetToken) {
        try {
            const user = await User.findById(userId);
            const preferences = await EmailPreferences.findByUserId(userId);
            
            if (!user || !preferences?.accountEmails.passwordReset) {
                return;
            }

            const result = await this.emailService.sendPasswordResetEmail(user, resetToken);
            await this.logEmailDelivery(userId, 'password-reset', result);
        } catch (error) {
            console.error('Error sending password reset email:', error);
        }
    }

    // Email verification
    async sendEmailVerification(userId, verificationToken) {
        try {
            const user = await User.findById(userId);
            const preferences = await EmailPreferences.findByUserId(userId);
            
            if (!user || !preferences?.accountEmails.emailVerification) {
                return;
            }

            const result = await this.emailService.sendEmailVerification(user, verificationToken);
            await this.logEmailDelivery(userId, 'email-verification', result);
        } catch (error) {
            console.error('Error sending email verification:', error);
        }
    }

    // Generate and send reports
    async generateMonthlyReport(userId, month, year) {
        try {
            const user = await User.findById(userId);
            const preferences = await EmailPreferences.findByUserId(userId);
            
            if (!user || !preferences?.reports.monthly.enabled) {
                return;
            }

            const startDate = moment({ year, month: month - 1 }).startOf('month').toDate();
            const endDate = moment({ year, month: month - 1 }).endOf('month').toDate();
            
            // Get transactions for the month
            const transactions = await Transaction.find({
                userId: userId,
                date: { $gte: startDate, $lte: endDate }
            });

            // Calculate totals by category
            const categories = {};
            let totalExpenses = 0;
            let totalIncome = 0;

            transactions.forEach(transaction => {
                if (transaction.type === 'expense') {
                    totalExpenses += transaction.amount;
                } else {
                    totalIncome += transaction.amount;
                }

                if (!categories[transaction.category]) {
                    categories[transaction.category] = {
                        name: transaction.category,
                        amount: 0,
                        count: 0
                    };
                }
                categories[transaction.category].amount += transaction.amount;
                categories[transaction.category].count++;
            });

            const reportData = {
                month: moment({ month: month - 1 }).format('MMMM'),
                year,
                totalExpenses,
                totalIncome,
                netIncome: totalIncome - totalExpenses,
                transactionCount: transactions.length,
                categories: Object.values(categories).sort((a, b) => b.amount - a.amount),
                topExpenseCategory: Object.values(categories)
                    .filter(cat => cat.amount > 0)
                    .sort((a, b) => b.amount - a.amount)[0]
            };

            const result = await this.emailService.sendMonthlyReport(user, reportData);
            await this.logEmailDelivery(userId, 'monthly-report', result);
        } catch (error) {
            console.error('Error generating monthly report:', error);
        }
    }

    async generateWeeklyReport(userId) {
        try {
            const user = await User.findById(userId);
            const preferences = await EmailPreferences.findByUserId(userId);
            
            if (!user || !preferences?.reports.weekly.enabled) {
                return;
            }

            const startOfWeek = moment().startOf('week').toDate();
            const endOfWeek = moment().endOf('week').toDate();
            
            const transactions = await Transaction.find({
                userId: userId,
                date: { $gte: startOfWeek, $lte: endOfWeek }
            });

            const categories = {};
            let totalExpenses = 0;

            transactions.forEach(transaction => {
                if (transaction.type === 'expense') {
                    totalExpenses += transaction.amount;
                    
                    if (!categories[transaction.category]) {
                        categories[transaction.category] = {
                            name: transaction.category,
                            amount: 0,
                            count: 0
                        };
                    }
                    categories[transaction.category].amount += transaction.amount;
                    categories[transaction.category].count++;
                }
            });

            const reportData = {
                weekStart: moment(startOfWeek).format('MMM DD'),
                weekEnd: moment(endOfWeek).format('MMM DD, YYYY'),
                totalExpenses,
                transactionCount: transactions.filter(t => t.type === 'expense').length,
                topCategories: Object.values(categories)
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 5), // Top 5 categories
                dailyAverage: totalExpenses / 7
            };

            const result = await this.emailService.sendWeeklyReport(user, reportData);
            await this.logEmailDelivery(userId, 'weekly-report', result);
        } catch (error) {
            console.error('Error generating weekly report:', error);
        }
    }

    // Newsletter and tips
    async sendPersonalizedTips(userId) {
        try {
            const user = await User.findById(userId);
            const preferences = await EmailPreferences.findByUserId(userId);
            
            if (!user || !preferences?.marketing.personalizedInsights) {
                return;
            }

            // Generate personalized tips based on spending patterns
            const tips = await this.generatePersonalizedTips(userId);
            
            const newsletter = {
                subject: 'Your Personalized Financial Tips',
                tips,
                type: 'personalized-tips'
            };

            const result = await this.emailService.sendNewsletterEmail(user, newsletter);
            await this.logEmailDelivery(userId, 'newsletter', result);
        } catch (error) {
            console.error('Error sending personalized tips:', error);
        }
    }

    // Helper methods
    async generatePersonalizedTips(userId) {
        // Analyze user's spending patterns and generate relevant tips
        const lastMonth = moment().subtract(1, 'month');
        const transactions = await Transaction.find({
            userId: userId,
            date: { $gte: lastMonth.startOf('month').toDate(), $lte: lastMonth.endOf('month').toDate() }
        });

        const tips = [];
        
        // Analyze spending patterns and add relevant tips
        if (transactions.length > 0) {
            // Add tips based on actual spending data
            tips.push({
                title: 'Track Your Progress',
                content: `You made ${transactions.length} transactions last month. Keep up the good tracking habit!`
            });
        }

        return tips;
    }

    async logEmailDelivery(userId, emailType, result) {
        try {
            const preferences = await EmailPreferences.findByUserId(userId);
            if (preferences) {
                if (result.success) {
                    preferences.deliveryStatus.lastEmailSent = new Date();
                    preferences.deliveryStatus.failedDeliveries = 0;
                } else {
                    preferences.deliveryStatus.failedDeliveries += 1;
                    preferences.deliveryStatus.lastFailure = new Date();
                    
                    // Blacklist if too many failures
                    if (preferences.deliveryStatus.failedDeliveries >= 5) {
                        preferences.deliveryStatus.isBlacklisted = true;
                    }
                }
                await preferences.save();
            }
        } catch (error) {
            console.error('Error logging email delivery:', error);
        }
    }

    // Queue management for batched notifications
    async queueTransactionForDailyDigest(user, transaction) {
        // Implementation for daily digest queuing
        // This would store transactions to be sent in a daily summary
    }

    async queueTransactionForWeeklyDigest(user, transaction) {
        // Implementation for weekly digest queuing
        // This would store transactions to be sent in a weekly summary
    }
}

module.exports = new NotificationService();