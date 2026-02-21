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

// Initialize Ollama (via OpenAI-compatible API)
let ollama;
if (config.ollama.baseUrl) {
    ollama = new OpenAI({
        apiKey: 'ollama', // Any string works for Ollama
        baseURL: `${config.ollama.baseUrl}/v1`,
        timeout: 60 * 1000, // Longer timeout for local CPU
        maxRetries: 1
    });
}

/**
 * Local fallback for intent detection when ALL AI providers fail
 */
const fallbackDetectIntent = (text) => {
    const lowerText = text.toLowerCase();

    // 1. Quick Ticket Keywords (Domain Lock, Password Reset)
    const isDomainLock = lowerText.includes('domain lock') || lowerText.includes('domain locked') || lowerText.includes('domainlock');
    const isPasswordReset = lowerText.includes('password reset') || lowerText.includes('reset password') || lowerText.includes('passwordreset');

    if (isDomainLock) {
        return {
            issue_type: "domain_lock",
            needs_troubleshooting: false,
            urgency: "high",
            action: "quick_ticket"
        };
    }

    if (isPasswordReset) {
        return {
            issue_type: "password_reset",
            needs_troubleshooting: false,
            urgency: "high",
            action: "quick_ticket"
        };
    }

    // 2. Ticket Keywords
    const isTicket = lowerText.includes('ticket') || lowerText.includes('raise') || lowerText.includes('open a case') || lowerText.includes('human') || lowerText.includes('support') || lowerText.includes('admin');

    // 3. Troubleshooting Keywords (Extensive)
    const isTrouble =
        lowerText.includes('weird') || lowerText.includes('broken') || lowerText.includes('not working') ||
        lowerText.includes('issue') || lowerText.includes('problem') || lowerText.includes('error') ||
        lowerText.includes('help') || lowerText.includes('slow') || lowerText.includes('network') ||
        lowerText.includes('internet') || lowerText.includes('wifi') || lowerText.includes('net ') || lowerText.includes('net_') || lowerText === 'net';

    if (isTicket) return { issue_type: "hardware", needs_troubleshooting: false, urgency: "medium", action: "create_ticket" };

    if (isTrouble) {
        // Detect specific type for better guided help
        let type = "hardware";
        if (lowerText.includes('network') || lowerText.includes('internet') || lowerText.includes('wifi') || lowerText.includes('slow') || lowerText.includes('net')) type = "network";
        if (lowerText.includes('password') || lowerText.includes('login') || lowerText.includes('account')) type = "password";
        if (lowerText.includes('printer')) type = "printer";
        if (lowerText.includes('vpn')) type = "vpn";
        if (lowerText.includes('biometric')) type = "biometric";
        if (lowerText.includes('freshservice')) type = "freshservice";

        return {
            issue_type: type,
            needs_troubleshooting: true,
            urgency: "medium",
            action: "troubleshoot"
        };
    }

    // 4. Greeting Detection
    if (lowerText.includes('hi') || lowerText.includes('hello') || lowerText.includes('hey')) {
        return {
            issue_type: "general_question",
            needs_troubleshooting: false,
            urgency: "low",
            action: "answer",
            direct_answer: "Hello! I'm your IT Helpdesk Assistant. I can help you troubleshoot technical issues or create a support ticket. What can I do for you today?"
        };
    }

    return {
        issue_type: "general_question",
        needs_troubleshooting: false,
        urgency: "low",
        action: "answer",
        direct_answer: "I'm having some trouble connecting to my primary AI right now. Are you reporting an issue (like a slow network or login problem) or would you like to create a ticket?"
    };
};

/**
 * Detect user intent using the AI Provider Chain
 */
const detectIntent = async (userMessage) => {
    const prompt = `
You are a concierge IT helpdesk assistant. Analyze: "\${userMessage}"
Provide JSON ONLY:
{
  "issue_type": "network/printer/password/software/hardware/email/vpn/biometric/freshservice/domain_lock/password_reset/general_question",
  "needs_troubleshooting": true/false,
  "urgency": "critical/high/medium/low",
  "suggested_article": "null or name",
  "direct_answer": "friendly response if no troubleshooting",
  "action": "create_ticket/troubleshoot/answer/quick_ticket/null"
}
Rules:
- If user mentions "domain lock" or "password reset" specifically, action="quick_ticket".
- If user asks to "create a ticket/raise issue/human", action="create_ticket".
- Shorthand: "net" -> "network", "syn" -> "sync issues", "drive" -> "software".
- Categories: network, software, hardware, security, password, printer, vpn.
- If user describes a problem (like "net issue"), action="troubleshoot" and needs_troubleshooting=true.
- If the user is asking "who/what are you", provide a direct answer explaining you are an IT Helpdesk Bot.
- If the input is unrelated to IT, use action="answer" and provide a professional direct_answer.
\`;

    // 1. INSTANT GREETING CHECK
    const lowerText = userMessage.trim().toLowerCase();
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'hola'];
    if (greetings.includes(lowerText)) {
        return {
            issue_type: "general_question",
            needs_troubleshooting: false,
            urgency: "low",
            action: "answer",
            direct_answer: "Hello! I'm your IT Helpdesk Assistant. I can help you troubleshoot technical issues or create a support ticket. What can I do for you today?"
        };
    }

    for (const provider of config.priority) {
        if (provider === 'ollama' && !ollama) continue;

        try {
            console.log(\`Trying \${provider} for intent detection...\`);
            let jsonString;

            const timeoutDuration = provider === 'ollama' ? 30000 : 8000;
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(\`\${provider} Timeout\`)), timeoutDuration)
            );

            if (provider === 'gemini' && geminiModel) {
                const result = await Promise.race([
                    geminiModel.generateContent(prompt),
                    timeoutPromise
                ]);
                jsonString = (await result.response).text();
            } else if ((provider === 'openai' && openai) || (provider === 'ollama' && ollama)) {
                const client = provider === 'openai' ? openai : ollama;
                const model = provider === 'openai' ? config.openai.model : config.ollama.model;

                const finalPrompt = provider === 'ollama'
                    ? \`[INST] Analyze: "\${userMessage}". JSON ONLY: {"action":"troubleshoot/create_ticket/answer/quick_ticket","issue_type":"...","needs_troubleshooting":true/false,"direct_answer":"..."} [/INST]\`
                    : prompt;

                const completion = await Promise.race([
                    client.chat.completions.create({
                        messages: [
                            { role: "system", content: "You are a helpful IT assistant. JSON ONLY." },
                            { role: "user", content: finalPrompt }
                        ],
                        model: model,
                        response_format: provider === 'openai' ? { type: "json_object" } : undefined
                    }),
                    timeoutPromise
                ]);
                jsonString = completion.choices[0].message.content;
            } else continue;

            console.log(\`RAW \${provider.toUpperCase()} INTENT OUTPUT:\`, jsonString);

            const match = jsonString.match(/\\{[\\s\\S]*\\}/);
            const cleaned = match ? match[0] : jsonString;
            const parsed = JSON.parse(cleaned);

            if (parsed.direct_answer && typeof parsed.direct_answer === 'string') {
                try {
                    const nested = JSON.parse(parsed.direct_answer);
                    if (nested.message) parsed.direct_answer = nested.message;
                    else if (nested.response) parsed.direct_answer = nested.response;
                    else if (nested.answer) parsed.direct_answer = nested.answer;
                } catch (e) {}
            }

            console.log(\`PARSED \${provider.toUpperCase()} INTENT:\`, parsed);
            return parsed;
        } catch (error) {
            console.error(\`\${provider} failed: \${error.message}\`);
        }
    }

    return fallbackDetectIntent(userMessage);
};

const generateDynamicSteps = async (issueDescription, forceFallback = false) => {
    const prompt = \`
Create a 5-step IT troubleshooting guide for the following issue: "\${issueDescription}"
Return EXACTLY a JSON array of 5 objects with "title", "actions", "expected_result".
\`;

    const getFallbackSteps = (desc) => {
        const lowerIssue = desc.toLowerCase();
        if (lowerIssue.includes('password') || lowerIssue.includes('login')) {
            return [
                { instruction: "*Check Caps Lock*\n• Verify your Caps Lock key is OFF.\n_Expected: Password matches._" },
                { instruction: "*Check Internet*\n• Ensure your device is online.\n_Expected: Online status confirmed._" },
                { instruction: "*Wait 15 Minutes*\n• Account might be locked.\n_Expected: Account unlocks._" },
                { instruction: "*Self-Service Reset*\n• Use the portal to reset password.\n_Expected: Email received._" },
                { instruction: "*Final Check*\n• Contact manager.\n_Expected: Access confirmed._" }
            ];
        }
        return [
            { instruction: "*Restart Application*\n• Reopen the app.\n_Expected: Fresh start._" },
            { instruction: "*Restart System*\n• Reboot computer.\n_Expected: Errors cleared._" },
            { instruction: "*Check Updates*\n• Look for pending updates.\n_Expected: Latest version._" },
            { instruction: "*Clear Cache*\n• Delete temporary files.\n_Expected: Data removed._" },
            { instruction: "*Network Check*\n• Verify stability.\n_Expected: Fixed._" }
        ];
    };

    if (forceFallback) return getFallbackSteps(issueDescription);

    for (const provider of config.priority) {
        try {
            console.log(\`Trying \${provider} for dynamic steps...\`);
            let jsonString;

            if (provider === 'gemini' && geminiModel) {
                const result = await geminiModel.generateContent(prompt);
                jsonString = (await result.response).text();
            } else if (provider === 'openai' && openai) {
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "system", content: "JSON ONLY." }, { role: "user", content: prompt }],
                    model: config.openai.model
                });
                jsonString = completion.choices[0].message.content;
            } else if (provider === 'ollama' && ollama) {
                const completion = await ollama.chat.completions.create({
                    messages: [{ role: "user", content: \`[INST] JSON ONLY 5 steps for: "\${issueDescription}" [/INST]\` }],
                    model: config.ollama.model
                });
                jsonString = completion.choices[0].message.content;
            } else continue;

            const match = jsonString.match(/\\[[\\s\\S]*\\]/) || jsonString.match(/\\{[\\s\\S]*\\}/);
            const cleaned = match ? match[0] : jsonString;
            const parsed = JSON.parse(cleaned);
            const rawSteps = Array.isArray(parsed) ? parsed : (parsed.steps || []);

            const formattedSteps = rawSteps.map(s => ({
                instruction: \`*\${s.title || "Step"}*\\n\${(s.actions || []).map(a => \`• \${a}\`).join('\\n')}\\n_Expected: \${s.expected_result || ""}_\`
            }));
            
            if (formattedSteps.length >= 5) return formattedSteps.slice(0, 5);
        } catch (error) {
            console.error(\`\${provider} failed: \${error.message}\`);
        }
    }
    return getFallbackSteps(issueDescription);
};

const generateResponse = async (userMessage, history) => {
    for (const provider of config.priority) {
        try {
            const client = provider === 'openai' ? openai : ollama;
            if (!client && provider !== 'gemini') continue;

            const completion = await client.chat.completions.create({
                messages: [{ role: "system", content: "You are a friendly IT assistant." }, ...history, { role: "user", content: userMessage }],
                model: provider === 'openai' ? config.openai.model : config.ollama.model
            });
            return completion.choices[0].message.content;
        } catch (error) {}
    }
    return "I'm having trouble with my AI right now. How can I help?";
};

module.exports = { detectIntent, generateDynamicSteps, generateResponse };
