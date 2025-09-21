// Quick test script for AI features
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Test Google AI connection
async function testAI() {
    try {

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });        
        const prompt = `
        You are a financial AI assistant. Categorize this transaction:
        
        Description: "Starbucks coffee"
        Amount: $5.50
        
        Available categories: Food & Dining (expense), Transportation (expense), Shopping (expense), Entertainment (expense), Healthcare (expense), Other (expense)
        
        Return ONLY a valid JSON response with this exact format:
        {"suggestedCategory": "Food & Dining", "confidence": 85, "reasoning": "Coffee purchase is typically categorized as Food & Dining"}
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        
        try {
            const parsed = JSON.parse(text);
        } catch (parseError) {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                const cleanedText = jsonMatch[1];
                try {
                    const parsed = JSON.parse(cleanedText);
                } catch (e) {
                    console.log('❌ Still invalid JSON after cleaning');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ AI Test Failed:', error.message);
        if (error.message.includes('API key')) {
            console.log('🔑 Please check your Google AI API key');
        } else if (error.message.includes('quota')) {
            console.log('💸 API quota exceeded. Check your Google AI billing');
        } else if (error.message.includes('blocked')) {
            console.log('🚫 Content was blocked by safety filters');
        }
    }
}

testAI();