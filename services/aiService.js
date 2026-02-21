const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const config = require("../config/ai");

// Initialize Gemini
let geminiModel;
if (config.gemini.apiKey) {
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    geminiModel = genAI.getGenerativeModel({ model: config.gemini.model });
}

// Initialize OpenAI
let openai;
if (config.openai.apiKey && config.openai.apiKey !== 'your-openai-api-key') {
    openai = new OpenAI({
        apiKey: config.openai.apiKey,
        timeout: 30 * 1000,
        maxRetries: 2
    });
}

// Initialize Ollama
let ollama;
if (config.ollama.baseUrl) {
    ollama = new OpenAI({
        apiKey: 'ollama',
        baseURL: `${config.ollama.baseUrl}/v1`,
        timeout: 60 * 1000,
        maxRetries: 1
    });
}

const fallbackDetectIntent = (text) => {
    const lowerText = text.toLowerCase();
    const isTrouble = lowerText.includes('issue') || lowerText.includes('problem') || lowerText.includes('error') || lowerText.includes('not working') || lowerText.includes('slow');
    const isGreeting = lowerText.includes('hi') || lowerText.includes('hello') || lowerText.includes('hey');

    if (isGreeting) {
        return { action: "answer", direct_answer: "Hello! How can I help you today?", needs_troubleshooting: false };
    }
    if (isTrouble) {
        return { action: "troubleshoot", needs_troubleshooting: true, issue_type: "general" };
    }
    return { action: "answer", direct_answer: "I'm here to help with IT issues. What's on your mind?", needs_troubleshooting: false };
};

const detectIntent = async (userMessage) => {
    // 1. Instant check for simple greetings to avoid AI latency
    const lowerText = userMessage.trim().toLowerCase();
    const greetings = ['hi', 'hello', 'hey', 'yo'];
    if (greetings.includes(lowerText)) {
        return { action: "answer", direct_answer: "Hello! I'm your IT Helpdesk Assistant. How can I help you today?", needs_troubleshooting: false };
    }

    const prompt = `You are an IT Assistant. Analyze this message and return JSON: "${userMessage}". JSON fields: action ("troubleshoot", "answer", "create_ticket"), issue_type, needs_troubleshooting (bool), direct_answer (string).`;

    for (const provider of config.priority) {
        try {
            let jsonString;
            if (provider === 'ollama' && ollama) {
                const completion = await ollama.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: config.ollama.model
                });
                jsonString = completion.choices[0].message.content;
            } else if (provider === 'gemini' && geminiModel) {
                const result = await geminiModel.generateContent(prompt);
                jsonString = result.response.text();
            } else continue;

            const match = jsonString.match(/\{[\s\S]*\}/);
            return JSON.parse(match ? match[0] : jsonString);
        } catch (e) {
            console.error(`${provider} failed:`, e.message);
        }
    }
    return fallbackDetectIntent(userMessage);
};

const generateDynamicSteps = async (issueDescription, forceFallback = false) => {
    const getFallbackSteps = () => ([
        { instruction: "*Restart Device*\n• Turn it off and on.\n_Expected: Clears errors._" },
        { instruction: "*Check Connections*\n• Verify cables/WiFi.\n_Expected: Connected._" },
        { instruction: "*Clear Cache*\n• Delete temporary files.\n_Expected: Data cleaned._" },
        { instruction: "*Update Software*\n• Check for updates.\n_Expected: Latest version._" },
        { instruction: "*Contact Support*\n• If failed, raise a ticket.\n_Expected: Ticket created._" }
    ]);

    if (forceFallback) return getFallbackSteps();

    for (const provider of config.priority) {
        try {
            let jsonString;
            const prompt = `Generate 5 IT troubleshooting steps for: "${issueDescription}". Return ONLY a JSON array of objects with "instruction" field.`;

            if (provider === 'ollama' && ollama) {
                const completion = await ollama.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: config.ollama.model
                });
                jsonString = completion.choices[0].message.content;
            } else if (provider === 'gemini' && geminiModel) {
                const result = await geminiModel.generateContent(prompt);
                jsonString = result.response.text();
            } else continue;

            const match = jsonString.match(/\[[\s\S]*\]/);
            const parsed = JSON.parse(match ? match[0] : jsonString);
            return Array.isArray(parsed) ? parsed.slice(0, 5) : getFallbackSteps();
        } catch (e) {
            console.error(`${provider} steps failed:`, e.message);
        }
    }
    return getFallbackSteps();
};

const generateResponse = async (userMessage, history) => {
    for (const provider of config.priority) {
        try {
            if (provider === 'ollama' && ollama) {
                const completion = await ollama.chat.completions.create({
                    messages: [{ role: "system", content: "You are a helpful IT assistant." }, ...history, { role: "user", content: userMessage }],
                    model: config.ollama.model
                });
                return completion.choices[0].message.content;
            }
        } catch (e) { }
    }
    return "I'm having trouble with my AI. How can I help?";
};

module.exports = { detectIntent, generateDynamicSteps, generateResponse };
