require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    console.log("🔍 Listing available Gemini models...\n");

    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY is missing.");
            return;
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Note: listModels is a method on the GoogleGenerativeAI instance in newer versions, 
        // or we might need to use the model manager if it exists. 
        // Let's try the standard way first.

        // Actually, for the NodeSDK, we might need to use the model to get info or just try a standard one.
        // There isn't a direct 'listModels' helper exposed easily in the high-level SDK sometimes, 
        // but let's try to just run a simple generation with 'gemini-pro' which is the base model.

        const modelNames = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-001'
        ];

        for (const modelName of modelNames) {
            console.log(`Checking model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                const response = await result.response;
                console.log(`✅ ${modelName} is AVAILABLE.`);
            } catch (error) {
                console.log(`❌ ${modelName} failed: ${error.message}`);
            }
        }

    } catch (error) {
        console.error(`❌ Fatal Error: ${error.message}`);
    }
}

listModels();
