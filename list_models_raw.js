require('dotenv').config();
const axios = require('axios');

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const models = response.data.models;
        const generateModels = models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
        console.log("Models supporting generateContent:");
        generateModels.forEach(m => console.log(`- ${m.name}`));
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

checkModels();
