const express = require('express');
const { auth } = require('../middleware/auth');
const aiController = require('../controllers/ai.controller');

const router = express.Router();

// Health check endpoint
router.get('/debug/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        aiApiKey: !!process.env.GOOGLE_AI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// All AI routes require authentication
router.use(auth);

// Debug endpoint with auth
router.post('/debug', aiController.debugAI);

// Transaction categorization
router.post('/categorize', aiController.categorizeTransaction);

// Spending analysis
router.post('/analyze-spending', aiController.analyzeSpendingPatterns);

// Budget prediction
router.post('/predict-budget', aiController.predictBudget);

// Financial health score
router.post('/health-score', aiController.calculateFinancialHealthScore);

// AI chat assistant
router.post('/chat', aiController.chatWithAssistant);

// Anomaly detection
router.post('/detect-anomalies', aiController.detectAnomalies);

// Personalized recommendations
router.post('/recommendations', aiController.getRecommendations);

module.exports = router;