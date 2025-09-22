const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templates = {};
        this.init();
    }

    async init() {
        this.registerHandlebarsHelpers();
        await this.initializeTransporter();
        this.loadTemplates();
    }

    registerHandlebarsHelpers() {
        // Register commonly used comparison helpers
        handlebars.registerHelper('eq', function (a, b) {
            return a === b;
        });

        handlebars.registerHelper('ne', function (a, b) {
            return a !== b;
        });

        handlebars.registerHelper('gt', function (a, b) {
            return a > b;
        });

        handlebars.registerHelper('gte', function (a, b) {
            return a >= b;
        });

        handlebars.registerHelper('lt', function (a, b) {
            return a < b;
        });

        handlebars.registerHelper('lte', function (a, b) {
            return a <= b;
        });

        // Helper for conditional logic
        handlebars.registerHelper('and', function (a, b) {
            return a && b;
        });

        handlebars.registerHelper('or', function (a, b) {
            return a || b;
        });

        // Helper for formatting numbers
        handlebars.registerHelper('formatNumber', function (num) {
            if (typeof num === 'number') {
                return num.toLocaleString();
            }
            return num;
        });

        // Helper for percentage formatting
        handlebars.registerHelper('percentage', function (num) {
            if (typeof num === 'number') {
                return Math.round(num) + '%';
            }
            return num;
        });

        // Helper for currency formatting
        handlebars.registerHelper('currency', function (amount) {
            if (typeof amount === 'number') {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(amount);
            }
            return amount;
        });

        // Helper for date formatting
        handlebars.registerHelper('formatDate', function (date) {
            if (date) {
                return new Intl.DateTimeFormat('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).format(new Date(date));
            }
            return date;
        });

        // Helper for uppercase
        handlebars.registerHelper('uppercase', function (str) {
            return str ? str.toString().toUpperCase() : '';
        });

        // Helper for lowercase
        handlebars.registerHelper('lowercase', function (str) {
            return str ? str.toString().toLowerCase() : '';
        });

        // Helper for absolute value
        handlebars.registerHelper('abs', function (num) {
            if (typeof num === 'number') {
                return Math.abs(num);
            }
            return num;
        });

        // Helper for rounding numbers
        handlebars.registerHelper('round', function (num) {
            if (typeof num === 'number') {
                return Math.round(num);
            }
            return num;
        });

        // Helper for conditional class names
        handlebars.registerHelper('conditionalClass', function (condition, trueClass, falseClass) {
            return condition ? trueClass : (falseClass || '');
        });

        console.log('✅ Handlebars helpers registered successfully');
    }

    async initializeTransporter() {
        // For development - using Gmail SMTP
        // In production, use services like SendGrid, AWS SES, etc.
        
        // Debug: Log email configuration (without password)
        console.log('Email configuration:', {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            user: process.env.EMAIL_USER,
            hasPassword: !!process.env.EMAIL_PASS,
            passwordLength: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0
        });

        // If using Ethereal Email for testing, create test account
        if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
            try {
                const nodemailer = require('nodemailer');
                const testAccount = await nodemailer.createTestAccount();
                
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });
                
                console.log('✅ Using Ethereal Email test service');
                console.log('📧 Test emails will be viewable at: https://ethereal.email/messages');
                console.log(`🔑 Test account: ${testAccount.user}`);
                return;
            } catch (error) {
                console.log('Ethereal setup failed, falling back to manual config');
            }
        }

        // Try different Gmail configuration approaches
        const gmailConfig = {
            service: 'gmail', // Use Gmail service directly
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        };

        // Alternative SMTP configuration
        const smtpConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        };

        // Try Gmail service first, fallback to SMTP
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('gmail')) {
                this.transporter = nodemailer.createTransport(gmailConfig);
                console.log('Using Gmail service configuration');
            } else {
                this.transporter = nodemailer.createTransport(smtpConfig);
                console.log('Using SMTP configuration');
            }
        } catch (error) {
            console.log('Email configuration failed:', error.message);
            this.transporter = nodemailer.createTransport(smtpConfig);
        }

        // Verify connection configuration
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('Email service configuration error:', error);
            } else {
                console.log('Email service is ready to send messages');
            }
        });
    }

    loadTemplates() {
        const templatesDir = path.join(__dirname, '../templates/email');
        
        // Create templates directory if it doesn't exist
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
        }

        const templateFiles = [
            'welcome.html',
            'transaction-notification.html',
            'budget-alert.html',
            'monthly-report.html',
            'weekly-report.html',
            'password-reset.html',
            'email-verification.html',
            'newsletter.html'
        ];

        templateFiles.forEach(file => {
            const templatePath = path.join(templatesDir, file);
            if (fs.existsSync(templatePath)) {
                const templateContent = fs.readFileSync(templatePath, 'utf8');
                const templateName = path.parse(file).name;
                this.templates[templateName] = handlebars.compile(templateContent);
            }
        });
    }

    async sendEmail(to, subject, templateName, data = {}) {
        try {
            if (!this.templates[templateName]) {
                throw new Error(`Template ${templateName} not found`);
            }

            const html = this.templates[templateName](data);
            
            const mailOptions = {
                from: `"EXTrace" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
                to,
                subject,
                html,
                // Add text version for accessibility
                text: this.extractTextFromHtml(html)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error.message };
        }
    }

    // Welcome email for new users
    async sendWelcomeEmail(user) {
        return await this.sendEmail(
            user.email,
            'Welcome to EXTrace - Your Financial Journey Begins!',
            'welcome',
            {
                name: user.name,
                email: user.email,
                dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
                supportUrl: `${process.env.FRONTEND_URL}/support`
            }
        );
    }

    // Transaction notification email
    async sendTransactionNotification(user, transaction) {
        return await this.sendEmail(
            user.email,
            `Transaction ${transaction.type}: ${transaction.category}`,
            'transaction-notification',
            {
                name: user.name,
                transaction: {
                    ...transaction,
                    formattedAmount: this.formatCurrency(transaction.amount),
                    formattedDate: this.formatDate(transaction.date)
                },
                dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
            }
        );
    }

    // Budget alert email
    async sendBudgetAlert(user, budget, spentAmount, percentage) {
        let alertType = 'warning';
        if (percentage >= 100) alertType = 'exceeded';
        else if (percentage >= 90) alertType = 'critical';

        return await this.sendEmail(
            user.email,
            `Budget Alert: ${budget.category} (${percentage}% used)`,
            'budget-alert',
            {
                name: user.name,
                budget: {
                    ...budget,
                    formattedLimit: this.formatCurrency(budget.limit),
                    formattedSpent: this.formatCurrency(spentAmount)
                },
                percentage: Math.round(percentage),
                alertType,
                dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/budgets`
            }
        );
    }

    // Monthly expense report
    async sendMonthlyReport(user, reportData) {
        return await this.sendEmail(
            user.email,
            `Your Monthly Expense Report - ${reportData.month} ${reportData.year}`,
            'monthly-report',
            {
                name: user.name,
                report: {
                    ...reportData,
                    formattedTotalExpenses: this.formatCurrency(reportData.totalExpenses),
                    formattedTotalIncome: this.formatCurrency(reportData.totalIncome),
                    categories: reportData.categories.map(cat => ({
                        ...cat,
                        formattedAmount: this.formatCurrency(cat.amount)
                    }))
                },
                dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/reports`
            }
        );
    }

    // Weekly summary report
    async sendWeeklyReport(user, reportData) {
        return await this.sendEmail(
            user.email,
            `Your Weekly Expense Summary - ${reportData.weekStart} to ${reportData.weekEnd}`,
            'weekly-report',
            {
                name: user.name,
                report: {
                    ...reportData,
                    formattedTotalExpenses: this.formatCurrency(reportData.totalExpenses),
                    topCategories: reportData.topCategories.map(cat => ({
                        ...cat,
                        formattedAmount: this.formatCurrency(cat.amount)
                    }))
                },
                dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
            }
        );
    }

    // Password reset email
    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
        
        return await this.sendEmail(
            user.email,
            'Reset Your EXTrace Password',
            'password-reset',
            {
                name: user.name,
                resetUrl,
                expiryTime: '1 hour'
            }
        );
    }

    // Email verification
    async sendEmailVerification(user, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
        
        return await this.sendEmail(
            user.email,
            'Verify Your EXTrace Account',
            'email-verification',
            {
                name: user.name,
                verificationUrl
            }
        );
    }

    // Newsletter/tips email
    async sendNewsletterEmail(user, newsletter) {
        return await this.sendEmail(
            user.email,
            newsletter.subject,
            'newsletter',
            {
                name: user.name,
                newsletter,
                unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${user.unsubscribeToken}`
            }
        );
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    }

    extractTextFromHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
}

module.exports = new EmailService();