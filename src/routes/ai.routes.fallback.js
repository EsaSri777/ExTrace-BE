const express = require('express');
const { auth } = require('../middleware/auth');
const { Transaction, Category, User } = require('../models');
const mongoose = require('mongoose');

const router = express.Router();

// Simple health check endpoint (no auth required)
router.get('/debug/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        aiApiKey: !!process.env.GOOGLE_AI_API_KEY,
        timestamp: new Date().toISOString(),
        message: 'AI service is running with fallbacks'
    });
});

// All other AI routes require authentication
router.use(auth);

// Simple fallback for spending analysis
router.post('/analyze-spending', async (req, res) => {
    try {        
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);
        
        // Get last month's transactions
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);

        const transactions = await Transaction.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).populate('categoryId');
        if (transactions.length === 0) {
            return res.json({
                monthlyTrend: 'stable',
                topCategories: [],
                insights: [],
                recommendations: ['Add some transactions to get personalized insights']
            });
        }

        // Calculate spending by category
        const categorySpending = {};
        let totalSpending = 0;

        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const categoryName = transaction.categoryId?.name || 'Uncategorized';
                categorySpending[categoryName] = (categorySpending[categoryName] || 0) + transaction.amount;
                totalSpending += transaction.amount;
            }
        });

        const topCategories = Object.entries(categorySpending)
            .map(([category, amount]) => ({
                category,
                percentage: Math.round((amount / totalSpending) * 100)
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 5);

        res.json({
            monthlyTrend: 'stable',
            topCategories,
            insights: [{
                type: 'spending_pattern',
                title: 'Spending Summary',
                description: `You spent $${totalSpending.toFixed(2)} across ${transactions.length} transactions this month.`,
                confidence: 100,
                actionable: true,
                action: 'Review your top spending categories'
            }],
            recommendations: [
                'Continue tracking your expenses',
                'Review your largest expense categories',
                'Set monthly spending limits'
            ]
        });
        
    } catch (error) {
        console.error('Spending analysis fallback error:', error);
        res.status(500).json({ error: 'Analysis service unavailable' });
    }
});

// Simple fallback for budget prediction
router.post('/predict-budget', async (req, res) => {
    try {        
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);
        
        // Get last 3 months of data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);

        const transactions = await Transaction.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).populate('categoryId');

        if (transactions.length === 0) {
            return res.json({
                nextMonthPrediction: 0,
                categoryBreakdown: [],
                confidence: 0,
                trend: 'stable'
            });
        }

        // Calculate monthly averages by category
        const categorySpending = {};
        let totalExpenses = 0;

        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const categoryName = transaction.categoryId?.name || 'Uncategorized';
                categorySpending[categoryName] = (categorySpending[categoryName] || 0) + transaction.amount;
                totalExpenses += transaction.amount;
            }
        });

        // Average over 3 months
        const monthlyAverage = totalExpenses / 3;
        
        const categoryBreakdown = Object.entries(categorySpending).map(([category, amount]) => {
            const monthlyAmount = amount / 3;
            return {
                category,
                predicted: Math.round(monthlyAmount),
                percentage: Math.round((monthlyAmount / monthlyAverage) * 100)
            };
        }).sort((a, b) => b.predicted - a.predicted);

        res.json({
            nextMonthPrediction: Math.round(monthlyAverage),
            categoryBreakdown,
            confidence: 75,
            trend: 'stable'
        });
        
    } catch (error) {
        console.error('Budget prediction fallback error:', error);
        res.status(500).json({ error: 'Prediction service unavailable' });
    }
});

// Simple fallback for health score
router.post('/health-score', async (req, res) => {
    try {        
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);

        // Get last 3 months of transactions
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);

        const transactions = await Transaction.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        });

        if (transactions.length === 0) {
            return res.json({
                score: 50,
                factors: [
                    { name: 'Transaction History', impact: 'neutral', description: 'Add transactions to get a personalized score' }
                ],
                improvements: ['Start tracking your income and expenses', 'Set up a budget']
            });
        }

        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
        
        // Simple scoring logic
        let score = 50; // Base score
        if (savingsRate > 20) score += 30;
        else if (savingsRate > 10) score += 15;
        if (transactions.length > 20) score += 10;
        if (income > expenses) score += 10;

        res.json({
            score: Math.min(100, Math.max(0, score)),
            factors: [
                { name: 'Savings Rate', impact: savingsRate > 10 ? 'positive' : 'negative', description: `${savingsRate.toFixed(1)}% savings rate` },
                { name: 'Transaction Frequency', impact: transactions.length > 20 ? 'positive' : 'neutral', description: `${transactions.length} transactions tracked` }
            ],
            improvements: [
                savingsRate < 10 ? 'Increase your savings rate' : 'Great savings habits!',
                'Track expenses more consistently',
                'Set specific financial goals'
            ]
        });
        
    } catch (error) {
        console.error('Health score fallback error:', error);
        res.status(500).json({ error: 'Health score service unavailable' });
    }
});

// Simple fallback for recommendations
router.post('/recommendations', async (req, res) => {
    try {        
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);

        const transactions = await Transaction.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).populate('categoryId');

        if (transactions.length === 0) {
            return res.json([
                {
                    type: 'budget_recommendation',
                    title: 'Start Tracking',
                    description: 'Begin by adding your income and expense transactions to get personalized recommendations.',
                    confidence: 100,
                    actionable: true,
                    action: 'Add your first transactions'
                },
                {
                    type: 'category_suggestion',
                    title: 'Set Up Categories',
                    description: 'Create expense categories to better organize your spending.',
                    confidence: 100,
                    actionable: true,
                    action: 'Create expense categories'
                }
            ]);
        }

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const recommendations = [
            {
                type: 'budget_recommendation',
                title: 'Track Your Spending',
                description: 'Continue monitoring your expenses to identify patterns',
                confidence: 100,
                actionable: true,
                action: 'Review your transactions weekly'
            }
        ];

        if (totalExpenses > totalIncome) {
            recommendations.push({
                type: 'budget_recommendation',
                title: 'Reduce Expenses',
                description: 'Your expenses exceed your income this month',
                confidence: 95,
                actionable: true,
                action: 'Identify areas to cut back spending'
            });
        }

        res.json(recommendations);
        
    } catch (error) {
        console.error('Recommendations fallback error:', error);
        res.status(500).json({ error: 'Recommendations service unavailable' });
    }
});

// Simple fallback for chat
router.post('/chat', async (req, res) => {
    try {        
        const { message } = req.body;
        const lowerMessage = message.toLowerCase();
        
        let response = "I'm currently running in fallback mode. Here are some general tips:";
        
        if (lowerMessage.includes('budget')) {
            response = "For budgeting, try the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings. Track your expenses in each category.";
        } else if (lowerMessage.includes('save')) {
            response = "Great question about savings! Start by setting up automatic transfers to a savings account. Even $25-50 per week adds up quickly.";
        } else if (lowerMessage.includes('expense')) {
            response = "To manage expenses better, categorize all your spending and review your largest categories monthly. Look for patterns and areas to optimize.";
        } else {
            response = "I'm here to help with your finances! Try asking about budgets, savings, or expense management. You can also check the reports section for detailed insights.";
        }

        res.json({
            response,
            suggestions: [
                'How can I save more money?',
                'What are my biggest expenses?',
                'Help me create a budget'
            ]
        });
        
    } catch (error) {
        console.error('Chat fallback error:', error);
        res.status(500).json({ error: 'Chat service unavailable' });
    }
});

// Placeholder endpoints for other features
router.post('/categorize', (req, res) => {
    res.json({
        suggestedCategory: 'General',
        confidence: 50,
        reasoning: 'Default category (AI service unavailable)'
    });
});

router.post('/detect-anomalies', (req, res) => {
    res.json([]);
});

module.exports = router;