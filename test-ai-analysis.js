// Test the actual AI analysis function
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Helper function to parse AI response (same as in controller)
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

async function testAIAnalysis() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const { Transaction } = require('./src/models');
        const userId = '68cd91dd5c3f3cdda0066b69';
        
        // Get transaction data (same logic as controller)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        
        const transactions = await Transaction.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).populate('categoryId');
                
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
        
        // Test AI analysis
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `
        Analyze this spending data and provide insights:
        
        Total Spending: $${totalSpending}
        Period: month
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
        
        Important: Return only the JSON object, no markdown formatting.
        `;
            
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
                
        try {
            const aiAnalysis = parseAIResponse(text);            
            const finalResult = {
                ...aiAnalysis,
                topCategories
            };
            
            
        } catch (parseError) {
            console.error('❌ AI parsing failed:', parseError.message);
            
            // Test fallback
            const fallback = {
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
            };
            
        }
        
        mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testAIAnalysis();