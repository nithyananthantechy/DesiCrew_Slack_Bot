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
        lowerText.includes('internet') || lowerText.includes('wifi') || lowerText.includes('password') ||
        lowerText.includes('login') || lowerText.includes('account') || lowerText.includes('printer') ||
        lowerText.includes('mouse') || lowerText.includes('keyboard') || lowerText.includes('screen') ||
        lowerText.includes('vpn') || lowerText.includes('biometric') || lowerText.includes('webcam') ||
        lowerText.includes('power') || lowerText.includes('monitor');

    if (isTicket) return { issue_type: "hardware", needs_troubleshooting: false, urgency: "medium", action: "create_ticket" };

    if (isTrouble) {
        // Detect specific type for better guided help
        let type = "hardware";
        if (lowerText.includes('network') || lowerText.includes('internet') || lowerText.includes('wifi') || lowerText.includes('slow')) type = "network";
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
You are a concierge IT helpdesk assistant. Analyze: "${userMessage}"
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
- If user mentions "domain lock" or "password reset" specifically, action="quick_ticket" with issue_type="domain_lock" or "password_reset".
- If user asks to "create a ticket/raise issue/human", action="create_ticket".
- If user describes a problem (even vaguely, like "it's broken") but NO ticket yet, action="troubleshoot" and needs_troubleshooting=true.
- Be aggressive with troubleshooting for any potential technical issue.
- If the user is asking "who/what are you", provide a direct answer explaining you are an IT Helpdesk Bot.
- If the input is purely social, an insult, or completely unrelated to IT, use action="answer" and provide a polite, professional direct_answer.
`;

    // 1. INSTANT GREETING CHECK (Avoids spending 15s on Ollama for 'Hi')
    const lowerText = userMessage.trim().toLowerCase();
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'hola'];
    if (greetings.includes(lowerText)) {
        console.log("Instant greeting detected. Bypassing AI.");
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
            console.log(`Trying ${provider} for intent detection...`);
            let jsonString;

            // Longer timeout for Ollama (30s), shorter for Cloud (5s) to avoid lag
            const timeoutDuration = provider === 'ollama' ? 30000 : 8000;
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${provider} Timeout`)), timeoutDuration)
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

                // Optimized prompt for Ollama to speed up generation
                const finalPrompt = provider === 'ollama'
                    ? `[INST] Analyze: "${userMessage}". JSON ONLY: {"action":"troubleshoot/create_ticket/answer/quick_ticket","issue_type":"...","needs_troubleshooting":true/false,"direct_answer":"..."} [/INST]`
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

            console.log(`RAW ${provider.toUpperCase()} INTENT OUTPUT:`, jsonString);

            const parsed = JSON.parse(cleaned);

            // Clean up direct_answer if it's a stringified JSON (common in local models)
            if (parsed.direct_answer && typeof parsed.direct_answer === 'string') {
                try {
                    const nested = JSON.parse(parsed.direct_answer);
                    if (nested.message) parsed.direct_answer = nested.message;
                    else if (nested.response) parsed.direct_answer = nested.response;
                    else if (nested.answer) parsed.direct_answer = nested.answer;
                } catch (e) {
                    // Not a JSON string, keep as is
                }
            }

            console.log(`PARSED ${provider.toUpperCase()} INTENT:`, parsed);
            return parsed;
        } catch (error) {
            console.error(`${provider} failed: ${error.message}`);
        }
    }

    // If cloud fails, use instant local regex (DO NOT wait for slow local AI for intent)
    console.log("Using local regex fallback for intent detection...");
    return fallbackDetectIntent(userMessage);
};

/**
 * Generate 5 troubleshooting steps using the AI Provider Chain
 */
const generateDynamicSteps = async (issueDescription, forceFallback = false) => {
    const prompt = `
Create a 5-step IT troubleshooting guide for the following issue, even if the description is vague: "${issueDescription}"
Return EXACTLY a JSON array of 5 objects. 
Each object MUST have: "title", "actions" (array of strings), and "expected_result".

If the issue is vague, provide the most relevant general troubleshooting steps for that category.

Example:
[
  {
    "title": "Initial Check",
    "actions": ["Verify cables", "Check power"],
    "expected_result": "Physical components verified"
  }
]
`;

    // Helper for fallback steps
    const getFallbackSteps = (desc) => {
        const lowerIssue = desc.toLowerCase();
        // 1. Account/Login Issues
        if (lowerIssue.includes('password') || lowerIssue.includes('login') || lowerIssue.includes('access') || lowerIssue.includes('account')) {
            return [
                { instruction: "*Check Caps Lock*\n• Verify your Caps Lock key is OFF.\n_Expected: Password matches._" },
                { instruction: "*Check Internet*\n• Ensure your device is online (WiFi/Ethernet/VPN).\n_Expected: Online status confirmed._" },
                { instruction: "*Wait 15 Minutes*\n• Your account might be temporarily locked. Stop trying for a bit.\n_Expected: Account unlocks._" },
                { instruction: "*Self-Service Reset*\n• Use the official company portal to reset your password.\n_Expected: Password reset email received._" },
                { instruction: "*Final Check*\n• Contact your direct manager to verify your access rights.\n_Expected: Access confirmed._" }
            ];
        }

        // 2. Hardware/Physical Issues
        if (lowerIssue.includes('broken') || lowerIssue.includes('weird') || lowerIssue.includes('plug') || lowerIssue.includes('cable') || lowerIssue.includes('keyboard') || lowerIssue.includes('mouse') || lowerIssue.includes('printer') || lowerIssue.includes('display') || lowerIssue.includes('screen')) {
            return [
                { instruction: "*Check Power*\n• Ensure the device is plugged in and turned on.\n_Expected: Device powers on._" },
                { instruction: "*Check Cables*\n• Unplug and replug all cables (USB, HDMI, Power).\n_Expected: Secure connection._" },
                { instruction: "*Restart Device*\n• Turn the device off and back on again.\n_Expected: Glitches cleared._" },
                { instruction: "*Check Environment*\n• See if others nearby have the same issue (Power outage?).\n_Expected: Rule out shared issue._" },
                { instruction: "*Internal Component Reset*\n• If battery-powered, drain the charge completely then plug back in.\n_Expected: Logic reset._" }
            ];
        }

        // 3. Catch-all Software/Performance Issue
        return [
            { instruction: "*Restart Application*\n• Completely close and reopen the app you are using.\n_Expected: Fresh start._" },
            { instruction: "*Restart System*\n• Reboot your computer or device.\n_Expected: Background errors cleared._" },
            { instruction: "*Check Updates*\n• Look for pending software or OS updates.\n_Expected: Latest version installed._" },
            { instruction: "*Clear Cache*\n• Delete temporary files or browser cache/cookies.\n_Expected: Conflicting data removed._" },
            { instruction: "*Internet Stability Check*\n• Verify your speed and connection stability.\n_Expected: Network ruled out._" }
        ];
    };

    if (forceFallback) {
        console.log("Forcing emergency fallback for dynamic steps...");
        return getFallbackSteps(issueDescription);
    }

    for (const provider of config.priority) {
        try {
            console.log(`Trying ${provider} for dynamic steps...`);
            let jsonString;

            if (provider === 'gemini' && geminiModel) {
                const result = await geminiModel.generateContent(prompt);
                jsonString = (await result.response).text();
            } else if (provider === 'openai' && openai) {
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "system", content: "You are a helpful IT expert. JSON ONLY. Return ONLY a JSON array of 5 steps." }, { role: "user", content: prompt }],
                    model: config.openai.model,
                    response_format: { type: "json_object" }
                });
                jsonString = completion.choices[0].message.content;
            } else if (provider === 'ollama' && ollama) {
                // Optimized prompt for Llama3 to ensure strict JSON adherence
                const ollamaPrompt = `[INST] You are an IT Support Expert. Generate EXACTLY 5 troubleshooting steps for: "${issueDescription}".
                
                RESPONSE RULES:
                1. Return ONLY a valid JSON object.
                2. Format: {"steps": [{"title": "Step Name", "actions": ["action 1", "action 2"], "expected_result": "result"}]}
                3. DO NOT include any introductory or concluding text. [/INST]`;

                const completion = await ollama.chat.completions.create({
                    messages: [{ role: "user", content: ollamaPrompt }],
                    model: config.ollama.model,
                    temperature: 0.2 // Lower temp for more consistent JSON
                });
                jsonString = completion.choices[0].message.content;
            } else continue;

            console.log(`RAW ${provider.toUpperCase()} STEPS OUTPUT:`, jsonString);

            // Robust JSON extraction (find FIRST match to avoid trailing fluff)
            let cleaned = jsonString;

            // Try different regex patterns for extraction
            const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
            const objectMatch = jsonString.match(/\{[\s\S]*\}/);

            if (arrayMatch) {
                cleaned = arrayMatch[0];
            } else if (objectMatch) {
                cleaned = objectMatch[0];
            }

            // Remove markdown code blocks if present
            cleaned = cleaned.replace(/```json\n?/, '').replace(/```\n?/, '').trim();

            let parsed;
            try {
                parsed = JSON.parse(cleaned);
            } catch (e) {
                console.error(`JSON parse failed for ${provider}:`, e.message);
                // Last ditch effort: remove common trailing Python/markdown or other junk
                cleaned = cleaned.split('\n').filter(line => !line.includes('```') && !line.includes('import ') && !line.includes('=')).join('\n');
                parsed = JSON.parse(cleaned);
            }

            const rawSteps = Array.isArray(parsed) ? parsed : (parsed.steps || []);

            // Format steps for the UI (Handle both simple and structured formats)
            const formattedSteps = rawSteps.map(s => {
                // If it's already a string or has 'instruction' but no structured fields
                if (typeof s === 'string') return { instruction: s };
                if (s.instruction && !s.title && !s.actions) return { instruction: s.instruction };

                const title = s.title || s.step || "Troubleshooting Step";
                const rawActions = Array.isArray(s.actions) ? s.actions : (s.action ? [s.action] : []);
                const actions = rawActions.map(a => {
                    if (typeof a === 'string') return a;
                    if (typeof a === 'object' && a !== null) {
                        return a.name || a.action || a.instruction || a.text || JSON.stringify(a);
                    }
                    return String(a);
                }).filter(a => a && a !== "null" && a !== "undefined");

                const actionsStr = actions.length > 0 ? actions.map(a => `• ${a}`).join('\n') : "• No specific actions provided.";
                const resultStr = s.expected_result ? `\n_Expected: ${s.expected_result}_` : "";

                return {
                    instruction: `*${title}*\n${actionsStr}${resultStr}`
                };
            });

            console.log(`PARSED ${provider.toUpperCase()} STEPS:`, formattedSteps.length);

            // Ensure we have at least 5 steps for the ticket rule
            if (formattedSteps.length > 0 && formattedSteps.length < 5) {
                console.log("Padding steps to reach 5...");
                const paddingNeeded = 5 - formattedSteps.length;
                for (let i = 0; i < paddingNeeded; i++) {
                    formattedSteps.push({
                        instruction: `*Final Verification Step*\n• Double check all previous actions and verify if the issue persists.\n_Expected: Issue resolved or ready for ticket._`
                    });
                }
            }

            if (formattedSteps.length > 0) {
                return formattedSteps.slice(0, 5);
            }
        } catch (error) {
            console.error(`${provider} failed: ${error.message}`);
        }
    }

    // Default fallback if all providers fail
    return getFallbackSteps(issueDescription);
};


/**
 * Generate a conversational response using the AI Provider Chain
 */
const generateResponse = async (userMessage, history) => {
    for (const provider of config.priority) {
        try {
            console.log(`Trying ${provider} for conversational response...`);

            if (provider === 'gemini' && geminiModel) {
                const chat = geminiModel.startChat({
                    history: history.map(h => ({
                        role: h.role === 'user' ? 'user' : 'model',
                        parts: [{ text: h.content }]
                    }))
                });
                const result = await chat.sendMessage(userMessage);
                return result.response.text();
            } else if ((provider === 'openai' && openai) || (provider === 'ollama' && ollama)) {
                const client = provider === 'openai' ? openai : ollama;
                const model = provider === 'openai' ? config.openai.model : config.ollama.model;

                // Add Llama3 specific tags if using Ollama
                const contentPrefix = provider === 'ollama' ? '[INST] ' : '';
                const contentSuffix = provider === 'ollama' ? ' [/INST]' : '';

                const completion = await client.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are a friendly and professional IT helpdesk assistant." },
                        ...history,
                        { role: "user", content: `${contentPrefix}${userMessage}${contentSuffix}` }
                    ],
                    model: model,
                    temperature: 0.7
                });
                return completion.choices[0].message.content;
            }
        } catch (error) {
            console.error(`${provider} failed: ${error.message}`);
        }
    }

    if (userMessage.toLowerCase().includes('hi') || userMessage.toLowerCase().includes('hello')) {
        return "Hello! I'm your IT Helpdesk Assistant. All my AI systems are a bit slow right now, but I'm still here to help! What can I do for you?";
    }
    return "I'm currently having trouble connecting to my AI providers. However, I can still help you! Would you like me to create a ticket for your issue?";
};

module.exports = {
    detectIntent,
    generateDynamicSteps,
    generateResponse
};
