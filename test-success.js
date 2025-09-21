// Simple AI success test
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testAISuccess() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
You are a financial AI assistant. Categorize this transaction and respond with ONLY a valid JSON object, no markdown formatting or extra text.

Transaction Details:
- Description: "Starbucks coffee"
- Amount: $5.50
- Merchant: "Starbucks"

Available categories: Food & Dining (expense), Transportation (expense), Shopping (expense), Entertainment (expense)

Return ONLY this JSON structure:
{"suggestedCategory": "Food & Dining", "confidence": 95, "reasoning": "Coffee purchase"}

Important: Do not use markdown code blocks or any other formatting. Return only the raw JSON object.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('🤖 AI Response:', text);

        // Parse using the same logic as our backend
        function parseAIResponse(text) {
            try {
                return JSON.parse(text);
            } catch (directParseError) {
                const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    const cleanedText = jsonMatch[1].trim();
                    return JSON.parse(cleanedText);
                } else {
                    throw directParseError;
                }
            }
        }

        const parsed = parseAIResponse(text);
        console.log('✅ Successfully parsed:', parsed);
        console.log('🎯 Category:', parsed.suggestedCategory);
        console.log('📊 Confidence:', parsed.confidence + '%');
        console.log('💡 Reasoning:', parsed.reasoning);
        console.log('\n🎉 AI Integration is working perfectly!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAISuccess();