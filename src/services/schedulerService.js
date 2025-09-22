const cron = require('node-cron');
const NotificationService = require('./notificationService');
const EmailPreferences = require('../models/emailPreferences.model');
const User = require('../models/user.model');
const moment = require('moment');

class SchedulerService {
    constructor() {
        this.jobs = {};
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) {
            console.log('Scheduler service is already running');
            return;
        }

        console.log('Starting email scheduler service...');
        
        // Daily reports - runs at 9:00 AM every day
        this.jobs.dailyReports = cron.schedule('0 9 * * *', async () => {
            console.log('Running daily report job...');
            await this.processDailyReports();
        }, { 
            scheduled: false,
            timezone: 'UTC' 
        });

        // Weekly reports - runs on Mondays at 9:00 AM
        this.jobs.weeklyReports = cron.schedule('0 9 * * 1', async () => {
            console.log('Running weekly report job...');
            await this.processWeeklyReports();
        }, { 
            scheduled: false,
            timezone: 'UTC' 
        });

        // Monthly reports - runs on 1st day of month at 9:00 AM
        this.jobs.monthlyReports = cron.schedule('0 9 1 * *', async () => {
            console.log('Running monthly report job...');
            await this.processMonthlyReports();
        }, { 
            scheduled: false,
            timezone: 'UTC' 
        });

        // Budget check - runs every hour during business hours
        this.jobs.budgetCheck = cron.schedule('0 9-17 * * *', async () => {
            console.log('Running budget check job...');
            await this.processBudgetChecks();
        }, { 
            scheduled: false,
            timezone: 'UTC' 
        });

        // Newsletter - runs on Fridays at 10:00 AM
        this.jobs.newsletter = cron.schedule('0 10 * * 5', async () => {
            console.log('Running newsletter job...');
            await this.processNewsletters();
        }, { 
            scheduled: false,
            timezone: 'UTC' 
        });

        // Start all jobs
        Object.values(this.jobs).forEach(job => job.start());
        
        this.isRunning = true;
        console.log('Email scheduler service started successfully');
    }

    stop() {
        if (!this.isRunning) {
            console.log('Scheduler service is not running');
            return;
        }

        console.log('Stopping email scheduler service...');
        
        Object.values(this.jobs).forEach(job => job.destroy());
        this.jobs = {};
        this.isRunning = false;
        
        console.log('Email scheduler service stopped');
    }

    async processDailyReports() {
        try {
            // This would be used for daily digest emails
            // Currently not implemented in preferences, but can be added
            console.log('Daily reports processing completed');
        } catch (error) {
            console.error('Error processing daily reports:', error);
        }
    }

    async processWeeklyReports() {
        try {
            const preferences = await EmailPreferences.find({
                'reports.weekly.enabled': true
            }).populate('userId');

            console.log(`Found ${preferences.length} users with weekly reports enabled`);

            for (const pref of preferences) {
                try {
                    const user = pref.userId;
                    if (!user) continue;

                    // Check if today matches user's preferred day
                    const today = moment().isoWeekday(); // 1 = Monday, 7 = Sunday
                    const preferredDay = pref.reports.weekly.dayOfWeek;

                    if (today === preferredDay) {
                        console.log(`Generating weekly report for user: ${user.email}`);
                        await NotificationService.generateWeeklyReport(user._id);
                        
                        // Add small delay to avoid overwhelming email service
                        await this.delay(1000);
                    }
                } catch (userError) {
                    console.error(`Error processing weekly report for user ${pref.userId}:`, userError);
                }
            }

            console.log('Weekly reports processing completed');
        } catch (error) {
            console.error('Error processing weekly reports:', error);
        }
    }

    async processMonthlyReports() {
        try {
            const preferences = await EmailPreferences.find({
                'reports.monthly.enabled': true
            }).populate('userId');

            console.log(`Found ${preferences.length} users with monthly reports enabled`);

            const lastMonth = moment().subtract(1, 'month');
            const month = lastMonth.month() + 1; // moment uses 0-based months
            const year = lastMonth.year();

            for (const pref of preferences) {
                try {
                    const user = pref.userId;
                    if (!user) continue;

                    // Check if today matches user's preferred day of month
                    const today = moment().date();
                    const preferredDay = pref.reports.monthly.dayOfMonth;

                    if (today === preferredDay) {
                        console.log(`Generating monthly report for user: ${user.email}`);
                        await NotificationService.generateMonthlyReport(user._id, month, year);
                        
                        // Add small delay to avoid overwhelming email service
                        await this.delay(1000);
                    }
                } catch (userError) {
                    console.error(`Error processing monthly report for user ${pref.userId}:`, userError);
                }
            }

            console.log('Monthly reports processing completed');
        } catch (error) {
            console.error('Error processing monthly reports:', error);
        }
    }

    async processBudgetChecks() {
        try {
            // This runs hourly to check for budget threshold breaches
            // In a real implementation, this might be triggered by transaction events
            // rather than scheduled checks
            
            const users = await User.find({ isActive: true });
            
            for (const user of users) {
                try {
                    // Check all categories for this user
                    // This is a simplified version - in reality, you'd want to be more selective
                    // about when to check budgets (e.g., only after transactions)
                    
                    const userCategories = await require('../models/category.model').find({ 
                        userId: user._id,
                        budgetLimit: { $exists: true, $gt: 0 }
                    });

                    for (const category of userCategories) {
                        await NotificationService.checkBudgetAlerts(user._id, category.name);
                    }
                    
                    // Small delay between users
                    await this.delay(500);
                } catch (userError) {
                    console.error(`Error checking budgets for user ${user._id}:`, userError);
                }
            }

            console.log('Budget checks processing completed');
        } catch (error) {
            console.error('Error processing budget checks:', error);
        }
    }

    async processNewsletters() {
        try {
            const preferences = await EmailPreferences.find({
                'marketing.newsletter': true
            }).populate('userId');

            console.log(`Found ${preferences.length} users subscribed to newsletter`);

            for (const pref of preferences) {
                try {
                    const user = pref.userId;
                    if (!user) continue;

                    console.log(`Sending personalized tips to user: ${user.email}`);
                    await NotificationService.sendPersonalizedTips(user._id);
                    
                    // Add delay to avoid overwhelming email service
                    await this.delay(2000);
                } catch (userError) {
                    console.error(`Error sending newsletter to user ${pref.userId}:`, userError);
                }
            }

            console.log('Newsletter processing completed');
        } catch (error) {
            console.error('Error processing newsletters:', error);
        }
    }

    // Utility method to add delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Manual trigger methods for testing
    async triggerWeeklyReports() {
        console.log('Manually triggering weekly reports...');
        await this.processWeeklyReports();
    }

    async triggerMonthlyReports() {
        console.log('Manually triggering monthly reports...');
        await this.processMonthlyReports();
    }

    async triggerBudgetChecks() {
        console.log('Manually triggering budget checks...');
        await this.processBudgetChecks();
    }

    async triggerNewsletters() {
        console.log('Manually triggering newsletters...');
        await this.processNewsletters();
    }

    // Status methods
    getStatus() {
        return {
            isRunning: this.isRunning,
            jobCount: Object.keys(this.jobs).length,
            jobs: Object.keys(this.jobs).map(jobName => ({
                name: jobName,
                running: this.jobs[jobName]?.running || false
            }))
        };
    }

    // Schedule a one-time job
    scheduleOneTime(cronExpression, jobFunction, jobName) {
        const job = cron.schedule(cronExpression, jobFunction, {
            scheduled: false
        });
        
        job.start();
        
        // Auto-cleanup after job runs
        job.on('task-done', () => {
            job.destroy();
            delete this.jobs[jobName];
        });
        
        this.jobs[jobName] = job;
        return job;
    }
}

module.exports = new SchedulerService();