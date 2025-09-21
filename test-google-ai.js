const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const testGoogleAI = async () => {
    try {
        console.log('🔑 Testing Google AI API Key...');
        console.log('API Key exists:', !!process.env.GOOGLE_AI_API_KEY);
        console.log('API Key starts with:', process.env.GOOGLE_AI_API_KEY?.substring(0, 10) + '...');
        
        if (!process.env.GOOGLE_AI_API_KEY) {
            console.error('❌ GOOGLE_AI_API_KEY not found in environment variables');
            return;
        }
        
        // Initialize Gemini AI
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        console.log('\n🤖 Testing simple AI query...');
        const result = await model.generateContent('Say "Hello World" in JSON format: {"message": "Hello World"}');
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ AI Response received:', text);
        
    } catch (error) {
        console.error('❌ Google AI API Test Failed:');
        console.error('Error message:', error.message);
        console.error('Status:', error.status);
        console.error('Status text:', error.statusText);
        
        if (error.status === 403) {
            console.log('\n🔧 Possible solutions:');
            console.log('1. Verify your API key is correct');
            console.log('2. Check if the API key has Gemini API access enabled');
            console.log('3. Make sure billing is enabled for your Google Cloud project');
            console.log('4. Check if there are any quotas or limits exceeded');
        }
    }
};

testGoogleAI();