require('dotenv').config();
const { App } = require('@slack/bolt');
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function verify() {
    console.log("🔍 Verifying credentials...\n");
    let allGood = true;

    // 1. Verify Slack Bot Token
    try {
        if (!process.env.SLACK_BOT_TOKEN || process.env.SLACK_BOT_TOKEN.startsWith('xoxb-your')) {
            console.error("❌ Slack Bot Token (SLACK_BOT_TOKEN) is missing or still set to placeholder.");
            allGood = false;
        } else {
            const app = new App({
                token: process.env.SLACK_BOT_TOKEN,
                signingSecret: process.env.SLACK_SIGNING_SECRET || 'test', // We just need token for auth.test
                appToken: process.env.SLACK_APP_TOKEN
            });

            const auth = await app.client.auth.test();
            console.log(`✅ Slack Bot Token is VALID. Connected as: ${auth.user} (${auth.team})`);
        }
    } catch (error) {
        console.error(`❌ Slack Bot Token Verification FAILED: ${error.message}`);
        allGood = false;
    }

    // 2. Verify Gemini API Key
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key') {
            console.error("❌ Gemini API Key (GEMINI_API_KEY) is missing or still set to placeholder.");
            allGood = false;
        } else {
            if (process.env.AI_PROVIDER === 'openai') {
                console.log("ℹ️ AI_PROVIDER is set to 'openai', skipping Gemini check.");
            } else {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-pro" });

                const result = await model.generateContent("Hello, are you working?");
                const response = await result.response;
                const text = response.text();

                if (text) {
                    console.log(`✅ Gemini API Key is VALID. Model responded: "${text.slice(0, 50)}..."`);
                } else {
                    console.error("❌ Gemini API responded but returned no text.");
                    allGood = false;
                }
            }
        }
    } catch (error) {
        console.error(`❌ Gemini API Verification FAILED: ${error.message}`);
        allGood = false;
    }

    // 3. Verify Freshservice
    try {
        const domain = process.env.FRESHSERVICE_DOMAIN;
        const apiKey = process.env.FRESHSERVICE_API_KEY;

        if (!domain || !apiKey || domain.includes('yourcompany')) {
            console.error("❌ Freshservice credentials missing or invalid.");
            allGood = false;
        } else {
            const axios = require('axios');
            const response = await axios.get(`https://${domain}/api/v2/tickets`, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(apiKey + ':X').toString('base64')}`
                }
            });
            if (response.status === 200) {
                console.log(`✅ Freshservice connection is VALID for domain: ${domain}`);
            }
        }
    } catch (error) {
        console.error(`❌ Freshservice Verification FAILED:`);
        if (error.response) {
            console.error(`  Status: ${error.response.status}`);
            console.error(`  Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`  Message: ${error.message}`);
        }
        allGood = false;
    }

    console.log("\n---------------------------------");
    if (allGood) {
        console.log("🎉 All systems go! You can run 'npm start' now.");
    } else {
        console.log("⚠️  Please fix the issues above in your .env file.");
    }
}

verify();
