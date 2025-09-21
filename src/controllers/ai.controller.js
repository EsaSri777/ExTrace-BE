const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Transaction, Category, User } = require('../models');
const mongoose = require('mongoose');

// Lazy initialization - create the AI instance only when needed
let genAI = null;

// Helper function to get Gemini model
const getGeminiModel = () => {
    // Initialize GenAI only when needed, ensuring env vars are loaded
    if (!genAI) {
        if (!process.env.GOOGLE_AI_API_KEY) {
            throw new Error('Google AI API key not configured');
        }
        genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
    
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

// Helper function to parse AI response (handles markdown code blocks)
const parseAIResponse = (text) => {
    try {
        // Try to parse directly first
        return JSON.parse(text);
    } catch (directParseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            const cleanedText = jsonMatch[1].trim();
            return JSON.parse(cleanedText);
        } else {
            throw directParseError;
        }
    }
};

// Categorize transaction using AI
const categorizeTransaction = async (req, res) => {
    try {
        const { description, amount, merchantInfo } = req.body;

        // Ensure we have a valid user ID
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);

        // Get existing categories for context
        const categories = await Category.find({ userId });
        const categoryNames = categories.map(cat => `${cat.name} (${cat.type})`).join(', ');

        const model = getGeminiModel();
        const prompt = `
You are a financial AI assistant. Categorize this transaction and respond with ONLY a valid JSON object, no markdown formatting or extra text.

Transaction Details:
- Description: "${description}"
- Amount: $${amount}
- Merchant: "${merchantInfo || 'Unknown'}"

Available categories: ${categoryNames}

Return ONLY this JSON structure:
{"suggestedCategory": "category_name", "confidence": 85, "reasoning": "brief explanation"}

Important: Do not use markdown code blocks or any other formatting. Return only the raw JSON object.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        try {
            const aiResponse = parseAIResponse(text);
            res.json(aiResponse);
        } catch (parseError) {
            console.error('JSON parsing failed:', parseError);
            // Fallback if AI doesn't return valid JSON
            const fallbackCategory = categories.find(cat => 
                description.toLowerCase().includes(cat.name.toLowerCase())
            );
            
            res.json({
                suggestedCategory: fallbackCategory?.name || 'Other',
                confidence: 50,
                reasoning: 'AI categorization not available, using keyword matching'
            });
        }
    } catch (error) {
        console.error('AI categorization error:', error);
        res.status(500).json({ error: 'AI categorization failed' });
    }
};

// Analyze spending patterns
const analyzeSpendingPatterns = async (req, res) => {
    try {
        const { period = 'month' } = req.body;
        
        // Ensure we have a valid user ID
        if (!req.user || !req.user._id) {
            console.error('❌ No authenticated user found');
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);
        
        // Get transaction data
        const endDate = new Date();
        const startDate = new Date();
        
        switch (period) {
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(startDate.getMonth() - 1);
        }

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

        // Use AI to analyze patterns and generate insights
        const model = getGeminiModel();
        const prompt = `
        Analyze this spending data and provide insights:
        
        Total Spending: $${totalSpending}
        Period: ${period}
        Top Categories: ${JSON.stringify(topCategories)}
        Number of Transactions: ${transactions.length}
        
        Provide analysis in JSON format:
        {
            "monthlyTrend": "increasing/decreasing/stable",
            "insights": [
                {
                    "type": "spending_pattern",
                    "title": "insight title",
                    "description": "detailed description",
                    "confidence": 85,
                    "actionable": true,
                    "action": "suggested action"
                }
            ],
            "recommendations": ["recommendation1", "recommendation2"]
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        try {
            const aiAnalysis = parseAIResponse(text);
            res.json({
                ...aiAnalysis,
                topCategories
            });
        } catch (parseError) {
            console.error('Spending analysis parsing failed:', parseError);
            // Fallback response
            res.json({
                monthlyTrend: 'stable',
                topCategories,
                insights: [{
                    type: 'spending_pattern',
                    title: 'Spending Summary',
                    description: `You spent $${totalSpending} across ${transactions.length} transactions.`,
                    confidence: 100,
                    actionable: false
                }],
                recommendations: ['Continue tracking your expenses', 'Review large expenses']
            });
        }
    } catch (error) {
        console.error('❌ Spending analysis error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Spending analysis failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Predict budget
const predictBudget = async (req, res) => {
    try {
        
        const { targetMonth } = req.body;
        
        // Ensure we have a valid user ID
        if (!req.user || !req.user._id) {
            console.error('❌ No authenticated user for budget prediction');
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

        try {
            const model = getGeminiModel();
            const prompt = `
        Based on this spending history, predict next month's budget:
        
        3-month average: $${monthlyAverage}
        Category breakdown: ${JSON.stringify(categoryBreakdown)}
        
        Provide response in JSON format:
        {
            "nextMonthPrediction": 1500,
            "confidence": 85,
            "trend": "increasing/decreasing/stable"
        }
        
        Consider seasonal trends and provide a realistic prediction.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const prediction = parseAIResponse(text);
            
            res.json({
                nextMonthPrediction: prediction.nextMonthPrediction || Math.round(monthlyAverage),
                categoryBreakdown,
                confidence: prediction.confidence || 75,
                trend: prediction.trend || 'stable'
            });
        } catch (aiError) {
            console.error('⚠️ AI budget prediction failed, using fallback:', aiError);
            // Simple trend analysis
            let trend = 'stable';
            if (transactions.length >= 60) { // At least 2 months of daily transactions
                const recentMonth = transactions.filter(t => {
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                    return t.date >= oneMonthAgo;
                }).reduce((sum, t) => t.type === 'expense' ? sum + t.amount : sum, 0);
                
                if (recentMonth > monthlyAverage * 1.1) trend = 'increasing';
                else if (recentMonth < monthlyAverage * 0.9) trend = 'decreasing';
            }

            res.json({
                nextMonthPrediction: Math.round(monthlyAverage * 1.05), // Slight increase assumption
                categoryBreakdown,
                confidence: 70,
                trend
            });
        }
    } catch (error) {
        console.error('❌ Budget prediction error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Budget prediction failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Financial health score
const calculateFinancialHealthScore = async (req, res) => {
    try {
        
        // Ensure we have a valid user ID
        if (!req.user || !req.user._id) {
            console.error('❌ No authenticated user for health score');
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);
        const user = await User.findById(userId);
        if (!user) {
            console.error('❌ User not found in database');
            return res.status(404).json({ error: 'User not found' });
        }

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
        const transactionCount = transactions.length;

        // Use AI to calculate health score with fallback
        try {
            const model = getGeminiModel();
            const prompt = `
            Calculate a financial health score (0-100) based on:
            
            Income (3 months): $${income}
            Expenses (3 months): $${expenses}
            Savings Rate: ${savingsRate.toFixed(2)}%
            Transaction Count: ${transactionCount}
            
            Provide response in JSON format:
            {
                "score": 75,
                "factors": [
                    {"name": "Savings Rate", "impact": "positive", "description": "Good savings rate"}
                ],
                "improvements": ["suggestion1", "suggestion2"]
            }
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            try {
                const healthScore = parseAIResponse(text);
                res.json(healthScore);
            } catch (parseError) {
                console.error('⚠️ Health score parsing failed, using fallback:', parseError);
                throw parseError; // Will trigger the fallback below
            }
        } catch (aiError) {
            console.error('⚠️ AI health score generation failed, using fallback:', aiError);
            // Simple fallback scoring
            let score = 50; // Base score
            if (savingsRate > 20) score += 30;
            else if (savingsRate > 10) score += 15;
            if (transactionCount > 20) score += 10;
            if (income > expenses) score += 10;
            
            const fallbackScore = {
                score: Math.min(100, Math.max(0, score)),
                factors: [
                    { name: 'Savings Rate', impact: savingsRate > 10 ? 'positive' : 'negative', description: `${savingsRate.toFixed(1)}% savings rate` },
                    { name: 'Transaction Frequency', impact: transactionCount > 20 ? 'positive' : 'neutral', description: `${transactionCount} transactions tracked` }
                ],
                improvements: [
                    savingsRate < 10 ? 'Increase your savings rate' : 'Great savings habits!',
                    'Track expenses more consistently',
                    'Set specific financial goals'
                ]
            };
            
            res.json(fallbackScore);
        }
    } catch (error) {
        console.error('❌ Health score error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Health score calculation failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Chat with AI assistant
const chatWithAssistant = async (req, res) => {
    try {
        const { message, context } = req.body;
        
        // Ensure we have a valid user ID
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);

        // Get user's recent financial data for context
        const recentTransactions = await Transaction.find({ userId })
            .populate('categoryId')
            .sort({ date: -1 })
            .limit(10);

        const model = getGeminiModel();
        const prompt = `
        You are a helpful financial AI assistant. The user asks: "${message}"
        
        User's recent transactions: ${JSON.stringify(recentTransactions.map(t => ({
            description: t.description,
            amount: t.amount,
            type: t.type,
            category: t.categoryId?.name
        })))}
        
        Context: ${JSON.stringify(context || {})}
        
        Provide a helpful response in JSON format:
        {
            "response": "your helpful response",
            "suggestions": ["suggestion1", "suggestion2"],
            "needsMoreInfo": false
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        try {
            const chatResponse = parseAIResponse(text);
            res.json(chatResponse);
        } catch (parseError) {
            console.error('Chat response parsing failed:', parseError);
            res.json({
                response: "I'm here to help with your finances! What would you like to know?",
                suggestions: ["Analyze my spending", "Budget recommendations", "Savings tips"],
                needsMoreInfo: false
            });
        }
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Chat service unavailable' });
    }
};

// Detect spending anomalies
const detectAnomalies = async (req, res) => {
    try {
        // Ensure we have a valid user ID
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);
        
        // Get recent transactions (last 3 months)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);

        const transactions = await Transaction.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).populate('categoryId');

        if (transactions.length === 0) {
            return res.json([]);
        }

        // Calculate average spending per category
        const categoryStats = {};
        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const categoryName = transaction.categoryId?.name || 'Uncategorized';
                if (!categoryStats[categoryName]) {
                    categoryStats[categoryName] = { amounts: [], count: 0 };
                }
                categoryStats[categoryName].amounts.push(transaction.amount);
                categoryStats[categoryName].count++;
            }
        });

        // Find anomalies
        const anomalies = [];
        Object.entries(categoryStats).forEach(([category, stats]) => {
            const amounts = stats.amounts;
            const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const maxAmount = Math.max(...amounts);
            
            // If any transaction is 3x the average, it's an anomaly
            if (maxAmount > avg * 3 && avg > 10) {
                anomalies.push({
                    type: 'anomaly_detection',
                    title: `Unusual ${category} Expense`,
                    description: `$${maxAmount} is significantly higher than your average $${avg.toFixed(2)} for ${category}`,
                    confidence: 85,
                    actionable: true,
                    action: 'Review this expense category'
                });
            }
        });

        res.json(anomalies);
    } catch (error) {
        console.error('Anomaly detection error:', error);
        res.status(500).json({ error: 'Anomaly detection failed' });
    }
};

// Get personalized recommendations
const getRecommendations = async (req, res) => {
    try {
        // Ensure we have a valid user ID
        if (!req.user || !req.user._id) {
            console.error('❌ No authenticated user for recommendations');
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);
        
        // Get user's financial data
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

        // Calculate category spending
        const categorySpending = {};
        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const categoryName = transaction.categoryId?.name || 'Uncategorized';
                categorySpending[categoryName] = (categorySpending[categoryName] || 0) + transaction.amount;
            }
        });
        try {
            const model = getGeminiModel();
            const prompt = `
    Based on this financial data, provide personalized recommendations:

    Total Income: $${totalIncome}
    Total Expenses: $${totalExpenses}
    Category Breakdown: ${JSON.stringify(categorySpending)}
    Savings Rate: ${totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0}%

    Generate 3-5 actionable financial recommendations as a JSON array:
    [
        {
            "type": "budget_recommendation",
            "title": "recommendation title",
            "description": "detailed advice",
            "confidence": 85,
            "actionable": true,
            "action": "specific action to take"
        }
    ]

    Important: Return only the JSON array, no markdown formatting.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const recommendations = parseAIResponse(text);
            res.json(recommendations);
        } catch (aiError) {
            console.error('⚠️ AI recommendations failed, using fallback:', aiError);
            // Fallback recommendations
            const fallbackRecommendations = [
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
                fallbackRecommendations.push({
                    type: 'budget_recommendation',
                    title: 'Reduce Expenses',
                    description: 'Your expenses exceed your income this month',
                    confidence: 95,
                    actionable: true,
                    action: 'Identify areas to cut back spending'
                });
            }

            if (Object.keys(categorySpending).length > 0) {
                const highestCategory = Object.entries(categorySpending)
                    .sort(([,a], [,b]) => b - a)[0];
                fallbackRecommendations.push({
                    type: 'category_suggestion',
                    title: 'Review Top Spending Category',
                    description: `You spent most on ${highestCategory[0]} ($${highestCategory[1]})`,
                    confidence: 90,
                    actionable: true,
                    action: `Analyze your ${highestCategory[0]} expenses`
                });
            }
            
            res.json(fallbackRecommendations);
        }
    } catch (error) {
        console.error('❌ Recommendations error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Recommendations service unavailable',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Debug function to test the AI controller without complex logic
const debugAI = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'No authenticated user' });
        }
        
        const userId = mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : new mongoose.Types.ObjectId(req.user._id);
        
        // Test database connection
        const transactionCount = await Transaction.countDocuments({ userId });
        const categoryCount = await Category.countDocuments({ userId });
        
        // Test AI service
        const model = getGeminiModel();
        const result = await model.generateContent('Say hello in JSON format: {"message": "hello"}');
        const response = await result.response;
        const text = response.text();
        
        res.json({
            success: true,
            user: {
                id: req.user._id,
                email: req.user.email
            },
            database: {
                transactions: transactionCount,
                categories: categoryCount
            },
            ai: {
                rawResponse: text,
                parsed: parseAIResponse(text)
            }
        });
        
    } catch (error) {
        console.error('Debug AI error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    categorizeTransaction,
    analyzeSpendingPatterns,
    predictBudget,
    calculateFinancialHealthScore,
    chatWithAssistant,
    detectAnomalies,
    getRecommendations,
    debugAI
};