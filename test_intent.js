require('dotenv').config();
const aiService = require('./services/aiService');

async function test() {
    const text = "Hi";
    const intent = await aiService.detectIntent(text);
    console.log(`Intent for "${text}":`, JSON.stringify(intent, null, 2));
}

test();
