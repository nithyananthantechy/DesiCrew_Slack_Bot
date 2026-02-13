
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No Gemini API key found in .env");
        return;
    }

    try {
        console.log("Testing Gemini API key...");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-flash-latest" });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log("Gemini Response:", response.text());
        console.log("SUCCESS: Gemini API is working!");
    } catch (error) {
        console.error("FAILURE: Gemini API test failed!");
        console.error(error.message);
    }
}

testGemini();
