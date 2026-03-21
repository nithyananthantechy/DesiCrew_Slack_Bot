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
    const lower = text.toLowerCase();

    // --- QUICK TICKET FAST PATH (typo-tolerant) ---
    const isDomainLock = /domain.{0,4}lock|domainlock(ed)?|unlock.{0,10}domain|unlock.{0,10}account|account.{0,10}lock(ed)?|account.{0,10}disable(d)?|locked.{0,10}out/i.test(lower);
    const isPasswordReset = /pa?s+w[oa]?r?d?.{0,4}reset|reset.{0,10}pa?s+w[oa]?r?d?|pwd.{0,4}reset|forgot.{0,10}pa?s+w[oa]?r?d?|pa?s+w[oa]?r?d?.{0,10}expire(d)?/i.test(lower);

    if (isDomainLock) {
        return { issue_type: "domain_lock", action: "quick_ticket", needs_troubleshooting: false };
    }
    if (isPasswordReset) {
        return { issue_type: "password_reset", action: "quick_ticket", needs_troubleshooting: false };
    }
    const isBiometricAccessRequest = lower.includes('new biometric') || lower.includes('request biometric') ||
        lower.includes('biometric access') || lower.includes('biometric request') ||
        lower.includes('provide biometric') || lower.includes('grant biometric') ||
        lower.includes('biometric provision') || /need.{0,10}biometric/i.test(lower);
    const isBiometricIssue = /biometric.{0,20}(issue|problem|not work|fail|error|trouble)/i.test(lower) ||
        /biometric.{0,20}(broken|doesn'?t work)/i.test(lower) ||
        /(issue|problem|trouble).{0,20}biometric/i.test(lower);
    if (isBiometricAccessRequest && !isBiometricIssue) {
        return { issue_type: "biometric", action: "quick_ticket", needs_troubleshooting: false };
    }

    // --- SOCIAL MEDIA ACCESS (ticket) vs SOCIAL MEDIA ISSUE (troubleshoot) ---
    const socialApps = ['whatsapp', 'whats app', 'instagram', 'facebook', 'telegram', 'twitter', 'linkedin', 'social media', 'messenger'];
    const hasSocialApp = socialApps.some(app => lower.includes(app));
    if (hasSocialApp) {
        const isSocialAccessRequest = /need.{0,15}access|request.{0,15}access|provide.{0,15}access|grant.{0,15}access|access.{0,10}(request|need)|want.{0,15}access|enable.{0,15}access/i.test(lower) ||
            lower.includes('access') || lower.includes('unblock') || lower.includes('enable');
        const isSocialIssue = /(not work|issue|problem|error|crash|fail|trouble|can'?t open|won'?t open|down|slow|hang|freeze|bug)/i.test(lower);
        if (isSocialIssue) {
            return { issue_type: "social_media_issue", action: "troubleshoot", needs_troubleshooting: true };
        }
        if (isSocialAccessRequest) {
            return { issue_type: "social_media_access", action: "quick_ticket", needs_troubleshooting: false };
        }
    }

    // --- BIOMETRIC APPROVAL RESPONSE ---
    if (/i.{0,5}(got|received|have).{0,15}approv/i.test(lower) || /approv(al|ed)/i.test(lower)) {
        return { action: "answer", direct_answer: "Thank you! Our IT team agent will reach out to you shortly to provide access. Please keep your Employee ID ready.", needs_troubleshooting: false };
    }

    // --- TICKET CREATION ---
    if (lower.includes('raise ticket') || lower.includes('create ticket') || lower.includes('new ticket') || lower.includes('log ticket') || lower.includes('need a ticket') || lower.includes('open ticket')) {
        return { issue_type: "general", action: "create_ticket", needs_troubleshooting: false };
    }

    // --- SOFTWARE INSTALL REQUEST ---
    const isAlreadyInstalled = /(already|have|has|had).{0,15}install|login/i.test(lower);
    if ((lower.includes('install') || lower.includes('need to install') || lower.includes('install package') || lower.includes('request software') || lower.includes('wps') || lower.includes('software request')) && !isAlreadyInstalled) {
        return { issue_type: "software_install", action: "quick_ticket", needs_troubleshooting: false };
    }

    // --- NETWORK / INTERNET ---
    if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('internet') || lower.includes('network') || lower.includes('no connection') || lower.includes('not connecting') || lower.includes('lan') || lower.includes('ethernet') || lower.includes('net issue') || lower.includes('net problem')) {
        return { issue_type: "network", action: "troubleshoot", needs_troubleshooting: true };
    }

    // --- VPN ---
    if (lower.includes('vpn') || lower.includes('tunnel') || lower.includes('remote access') || lower.includes('ssl vpn')) {
        return { issue_type: "vpn", action: "troubleshoot", needs_troubleshooting: true };
    }

    // --- PRINTER ---
    if (lower.includes('printer') || lower.includes('printing') || lower.includes('print queue') || lower.includes('scanner') || lower.includes('scan')) {
        return { issue_type: "printer", action: "troubleshoot", needs_troubleshooting: true };
    }

    // --- HARDWARE (keyboard, mouse, screen, etc.) ---
    if (lower.includes('keyboard') || lower.includes('mouse') || lower.includes('monitor') || lower.includes('screen') || lower.includes('display') || lower.includes('usb') || lower.includes('charger') || lower.includes('charging') || lower.includes('battery') || lower.includes('hardware') || lower.includes('device') || lower.includes('headset') || lower.includes('headphone') || lower.includes('webcam') || lower.includes('camera') || lower.includes('microphone')) {
        return { issue_type: "hardware", action: "troubleshoot", needs_troubleshooting: true };
    }

    // --- SLOW / PERFORMANCE ---
    if (lower.includes('slow') || lower.includes('hanging') || lower.includes('freezing') || lower.includes('frozen') || lower.includes('lag') || lower.includes('performance') || lower.includes('unresponsive') || lower.includes('not responding') || lower.includes('high cpu') || lower.includes('ram')) {
        return { issue_type: "software", action: "troubleshoot", needs_troubleshooting: true };
    }

    // --- BLUE SCREEN / CRASH ---
    if (lower.includes('blue screen') || lower.includes('bsod') || lower.includes('black screen') || lower.includes('crash') || lower.includes('restart') || lower.includes('reboot') || lower.includes('shutdown') || lower.includes('not booting') || lower.includes('won\'t start')) {
        return { issue_type: "software", action: "troubleshoot", needs_troubleshooting: true };
    }

    // --- MALWARE / VIRUS ---
    if (lower.includes('malware') || lower.includes('virus') || lower.includes('infected') || lower.includes('infection') || lower.includes('ransomware') || lower.includes('trojan') || lower.includes('spyware') || lower.includes('threat detected') || lower.includes('antivirus')) {
        return { issue_type: "malware", action: "troubleshoot", needs_troubleshooting: true };
    }



    // --- SOFTWARE / APP ISSUES ---
    if (lower.includes('software') || lower.includes('application') || lower.includes('app') || lower.includes('uninstall') || lower.includes('update') || lower.includes('upgrade') || lower.includes('office') || lower.includes('excel') || lower.includes('word') || lower.includes('teams') || lower.includes('zoom') || lower.includes('chrome') || lower.includes('browser') || lower.includes('error') || lower.includes('not working') || lower.includes('not opening') || lower.includes("won't open") || lower.includes('slack')) {
        return { issue_type: "software", action: "troubleshoot", needs_troubleshooting: true };
    }

    // --- EMAIL ---
    if (lower.includes('email') || lower.includes('mail') || lower.includes('outlook') || lower.includes('gmail') || lower.includes('inbox') || lower.includes('smtp') || lower.includes('calendar') || lower.includes('meeting invite')) {
        return { issue_type: "email", action: "troubleshoot", needs_troubleshooting: true };
    }

    // --- PASSWORD / ACCESS ---
    if (lower.includes('password') || lower.includes('forgot') || lower.includes('locked out') || lower.includes('login') || lower.includes('cannot login') || lower.includes('access denied') || lower.includes('account')) {
        return { issue_type: "password_reset", action: "quick_ticket", needs_troubleshooting: false };
    }

    // --- BIOMETRIC ISSUE (troubleshoot) vs BIOMETRIC ACCESS (ticket) ---
    if (lower.includes('biometric') || lower.includes('fingerprint') || lower.includes('attendance') || lower.includes('punch')) {
        const isBioRequest = lower.includes('new biometric') || lower.includes('request biometric') ||
            lower.includes('biometric access') || lower.includes('biometric request') ||
            lower.includes('provide biometric') || lower.includes('grant biometric') ||
            /need.{0,10}biometric/i.test(lower);
        const isBioIssue = /biometric.{0,20}(issue|problem|not work|fail|error)/i.test(lower) ||
            /(issue|problem|trouble).{0,20}biometric/i.test(lower);
        if (isBioRequest && !isBioIssue) {
            return { issue_type: "biometric", action: "quick_ticket", needs_troubleshooting: false };
        }
        return { issue_type: "biometric", action: "troubleshoot", needs_troubleshooting: true };
    }

    // --- GREETING ---
    const greetings = ['hi', 'hello', 'hey', 'yo', 'morning', 'afternoon', 'evening', 'hola'];
    const words = lower.split(/\s+/);
    if (greetings.includes(words[0]) && words.length <= 4) {
        return { action: "answer", direct_answer: "Hello! I'm your IT Helpdesk Assistant. How can I help you today?", needs_troubleshooting: false };
    }

    // --- GENERAL FALLBACK ---
    return { action: "troubleshoot", needs_troubleshooting: true, issue_type: "general" };
};

const detectIntent = async (userMessage) => {
    // 1. FAST GREETING check
    const lowerText = userMessage.trim().toLowerCase();
    const greetings = ['hi', 'hello', 'hey', 'yo', 'morning', 'afternoon', 'evening', 'hola'];
    const words = lowerText.split(/\s+/);

    // Check if message starts with a greeting word and is short (max 4 words)
    if (greetings.includes(words[0]) && words.length <= 4) {
        console.log(`⚡ Fast-path greeting match: "${words[0]}"`);
        return {
            action: "answer",
            direct_answer: "Hello! I'm your IT Helpdesk Assistant. I can help you troubleshoot technical issues or create a support ticket. What can I do for you today?",
            needs_troubleshooting: false
        };
    }

    // 1.5 FAST BIOMETRIC REQUEST check ("provide/grant biometric access" → ticket, "biometric issue" → troubleshoot)
    const isBiometricIssue = /biometric.{0,20}(issue|problem|not work|fail|error|trouble)/i.test(lowerText) ||
        /biometric.{0,20}(broken|doesn'?t work)/i.test(lowerText) ||
        /(issue|problem|trouble).{0,20}biometric/i.test(lowerText);
    const isBiometricRequest = lowerText.includes('new biometric') || lowerText.includes('request biometric') ||
        lowerText.includes('biometric access') || lowerText.includes('biometric request') ||
        lowerText.includes('provide biometric') || lowerText.includes('grant biometric') ||
        lowerText.includes('biometric provision') || /need.{0,10}biometric/i.test(lowerText);
    if (isBiometricRequest && !isBiometricIssue) {
        console.log(`⚡ Fast-path biometric ACCESS ticket match: "${lowerText}"`);
        return {
            action: "quick_ticket",
            issue_type: "biometric",
            needs_troubleshooting: false
        };
    }
    if (isBiometricIssue) {
        console.log(`⚡ Fast-path biometric ISSUE troubleshoot match: "${lowerText}"`);
        return {
            action: "troubleshoot",
            issue_type: "biometric",
            needs_troubleshooting: true
        };
    }

    // 1.55 FAST SOCIAL MEDIA ACCESS vs ISSUE check
    const socialApps = ['whatsapp', 'whats app', 'instagram', 'facebook', 'telegram', 'twitter', 'linkedin', 'social media', 'messenger'];
    const hasSocialApp = socialApps.some(app => lowerText.includes(app));
    if (hasSocialApp) {
        const isSocialIssue = /(not work|issue|problem|error|crash|fail|trouble|can'?t open|won'?t open|down|slow|hang|freeze|bug)/i.test(lowerText);
        const isSocialAccessRequest = /need.{0,15}access|request.{0,15}access|provide.{0,15}access|grant.{0,15}access|want.{0,15}access|enable.{0,15}access/i.test(lowerText) ||
            lowerText.includes('access') || lowerText.includes('unblock') || lowerText.includes('enable');
        if (isSocialIssue) {
            console.log(`⚡ Fast-path social media ISSUE troubleshoot match: "${lowerText}"`);
            return {
                action: "troubleshoot",
                issue_type: "social_media_issue",
                needs_troubleshooting: true
            };
        }
        if (isSocialAccessRequest) {
            console.log(`⚡ Fast-path social media ACCESS ticket match: "${lowerText}"`);
            return {
                action: "quick_ticket",
                issue_type: "social_media_access",
                needs_troubleshooting: false
            };
        }
    }

    // 1.56 FAST BIOMETRIC APPROVAL RESPONSE
    if (/i.{0,5}(got|received|have).{0,15}approv/i.test(lowerText) || (/approv(al|ed)/i.test(lowerText) && words.length <= 8)) {
        console.log(`⚡ Fast-path biometric approval response match: "${lowerText}"`);
        return {
            action: "answer",
            direct_answer: "Thank you! Our IT team agent will reach out to you shortly to provide access. Please keep your Employee ID ready.",
            needs_troubleshooting: false
        };
    }

    // 1.6 FAST DOMAIN LOCK & PASSWORD RESET check (typo-tolerant using expanded regex)
    const isDomainLockFast = /domain.{0,4}lock|domainlock(ed)?|unlock.{0,10}domain|unlock.{0,10}account|account.{0,10}lock(ed)?|account.{0,10}disable(d)?|locked.{0,10}out/i.test(lowerText);
    const isPasswordResetFast = /pa?s+w[oa]?r?d?.{0,4}reset|reset.{0,10}pa?s+w[oa]?r?d?|pwd.{0,4}reset|forgot.{0,10}pa?s+w[oa]?r?d?|pa?s+w[oa]?r?d?.{0,10}expire(d)?/i.test(lowerText);

    if (isDomainLockFast) {
        console.log(`⚡ Fast-path domain lock match: "${lowerText}"`);
        return {
            action: "quick_ticket",
            issue_type: "domain_lock",
            needs_troubleshooting: false
        };
    }
    if (isPasswordResetFast) {
        console.log(`⚡ Fast-path password reset match: "${lowerText}"`);
        return {
            action: "quick_ticket",
            issue_type: "password_reset",
            needs_troubleshooting: false
        };
    }

    // 2. Full IT Assistant Prompt
    const prompt = `
You are a concierge IT helpdesk assistant. Analyze: "${userMessage}"
Provide JSON ONLY. DO NOT return any other text or explanation. Use this EXACT schema:
{
  "issue_type": "network/printer/password/software/hardware/email/vpn/biometric/freshservice/domain_lock/password_reset/general_question",
  "needs_troubleshooting": true,
  "urgency": "medium",
  "suggested_article": null,
  "direct_answer": "friendly response",
  "action": "create_ticket/troubleshoot/answer/quick_ticket"
}
Rules:
- HIGHEST PRIORITY: If user mentions "software installation" / "install [software]" (e.g. "install forticlient vpn"), action="quick_ticket" and issue_type="software_install". Do not categorize as "vpn" or "software". BUT if the user says they "already installed" it or are having "login issues", it is NOT an install request; classify as "troubleshoot" and issue_type="software".
- If user mentions "domain lock", "password reset", or wants to "provide/grant/request/get biometric access" (NOT a biometric device problem), action="quick_ticket".
- If user wants "access to WhatsApp/Instagram/social media" (NOT an app crash/issue), action="quick_ticket" and issue_type="social_media_access".
- If user says a social media or messaging app "is not working", "crashing", or "has an issue", action="troubleshoot" and issue_type="social_media_issue".
- If user asks to "create a ticket/raise issue/human", action="create_ticket".
- If user provides shorthand issue with a location (e.g., "Keyboard issue, HL, ground floor - Kollu"), action="create_ticket" and issue_type="hardware".
- Shorthand: "net" -> "network", "syn" -> "sync issues", "drive" -> "software", "mouse" -> "hardware", "keyboard" -> "hardware", "bio" -> "biometric", "insta" -> "social_media_issue".
- For specific app issues (like "Slack login issue", "Teams error"), action="troubleshoot", issue_type="software", needs_troubleshooting=true. Do NOT classify app logins as domain_lock or password_reset.
- If user describes a problem (like "net issue" or "biometric not working"), action="troubleshoot" and needs_troubleshooting=true.
- If the user is asking "who are you", explain you are an IT Helpdesk Bot.
`;

    for (const provider of config.priority) {
        try {
            let jsonString;
            let timeoutId;
            const timeoutDuration = provider === 'ollama' ? 30000 : 5000; // Increased Ollama timeout to 30s
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(`${provider} Timeout`)), timeoutDuration);
            });

            try {
                if (provider === 'ollama' && ollama) {
                    const completion = await Promise.race([
                        ollama.chat.completions.create({
                            messages: [
                                { role: "system", content: "You are an IT helpdesk bot. JSON ONLY." },
                                { role: "user", content: `[INST] Analyze: "${userMessage}". JSON ONLY. [/INST]` }
                            ],
                            model: config.ollama.model
                        }),
                        timeoutPromise
                    ]);
                    jsonString = completion.choices[0].message.content;
                } else if (provider === 'openai' && openai) {
                    const completion = await Promise.race([
                        openai.chat.completions.create({
                            messages: [
                                { role: "system", content: "You are an IT helpdesk bot. JSON ONLY." },
                                { role: "user", content: prompt }
                            ],
                            model: config.openai.model
                        }),
                        timeoutPromise
                    ]);
                    jsonString = completion.choices[0].message.content;
                } else if (provider === 'gemini' && geminiModel) {
                    const result = await Promise.race([
                        geminiModel.generateContent(prompt),
                        timeoutPromise
                    ]);
                    jsonString = result.response.text();
                } else {
                    clearTimeout(timeoutId);
                    continue;
                }
            } finally {
                clearTimeout(timeoutId);
            }

            const match = jsonString.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("No JSON found in response");

            const parsed = JSON.parse(match[0]);
            
            // Validate required fields
            if (!parsed.action || !parsed.issue_type) {
                throw new Error("Parsed JSON is missing required fields (action or issue_type)");
            }

            console.log(`PARSED ${provider.toUpperCase()} INTENT:`, parsed);
            return parsed;
        } catch (e) {
            console.error(`${provider} intent failed:`, e.message);
        }
    }
    return fallbackDetectIntent(userMessage);
};

const generateDynamicSteps = async (issueDescription, forceFallback = false) => {
    const getFallbackSteps = (desc) => {
        const lower = desc.toLowerCase();
        if (lower.includes('mouse')) {
            return [
                { instruction: "*Check Connection*\n• Unplug and replug the mouse.\n_Expected: Connected._" },
                { instruction: "*Try Port*\n• Use a different USB port.\n_Expected: Port ruled out._" },
                { instruction: "*Check Battery*\n• If wireless, replace batteries.\n_Expected: Power confirmed._" },
                { instruction: "*Update Driver*\n• Check Device Manager for updates.\n_Expected: Softare ruled out._" },
                { instruction: "*Test Surface*\n• Try on a khác surface or mouse pad.\n_Expected: Resolved._" }
            ];
        }
        return [
            { instruction: "*Restart System*\n• Reboot your computer.\n_Expected: Errors cleared._" },
            { instruction: "*Check Cables*\n• Ensure all physical connections are tight.\n_Expected: Secure connection._" },
            { instruction: "*Check Internet*\n• Verify your WiFi or Ethernet signal.\n_Expected: Online status._" },
            { instruction: "*Clear Cache*\n• Delete temporary files or browser data.\n_Expected: Conflict removed._" },
            { instruction: "*Contact Helpdesk*\n• If failed, we will raise a ticket.\n_Expected: Ticket created._" }
        ];
    };

    if (forceFallback) return getFallbackSteps(issueDescription);

    for (const provider of config.priority) {
        try {
            let jsonString;
            const prompt = `Generate 5 structured, basic IT troubleshooting steps for: "${issueDescription}". The steps MUST be extremely simple and easy for a non-technical end-user to follow. Do NOT suggest advanced tools like Event Viewer, BIOS, Registry Editor, or Command Prompt. Focus on safe, standard user actions like restarting the application/computer, checking physical cables, basic settings, or closing heavy apps. Return ONLY a JSON array of 5 objects with "title", "actions" (array), and "expected_result".`;

            if (provider === 'ollama' && ollama) {
                const completion = await ollama.chat.completions.create({
                    messages: [{ role: "user", content: `[INST] ${prompt} [/INST]` }],
                    model: config.ollama.model
                });
                jsonString = completion.choices[0].message.content;
            } else if (provider === 'gemini' && geminiModel) {
                const result = await geminiModel.generateContent(prompt);
                jsonString = result.response.text();
            } else continue;

            const match = jsonString.match(/\[[\s\S]*\]/);
            if (!match) throw new Error("No JSON array found");
            const parsed = JSON.parse(match[0]);

            return parsed.slice(0, 5).map(s => ({
                instruction: `*${s.title || "Step"}*\n${(s.actions || []).map(a => `• ${a}`).join('\n')}\n_Expected: ${s.expected_result || ""}_`
            }));
        } catch (e) {
            console.error(`${provider} steps failed:`, e.message);
        }
    }
    return getFallbackSteps(issueDescription);
};

const generateResponse = async (userMessage, history) => {
    for (const provider of config.priority) {
        try {
            if (provider === 'ollama' && ollama) {
                const completion = await ollama.chat.completions.create({
                    messages: [{ role: "system", content: "You are a friendly IT assistant." }, ...history, { role: "user", content: userMessage }],
                    model: config.ollama.model
                });
                return completion.choices[0].message.content;
            }
        } catch (e) { }
    }
    return "I'm having trouble with my AI right now. How can I help you?";
};

module.exports = { detectIntent, generateDynamicSteps, generateResponse };
