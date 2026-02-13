const { App } = require('@slack/bolt');
const fs = require('fs');
fs.appendFileSync('startup.log', `[${new Date().toISOString()}] Bot application started/reloaded\n`);
const config = require('./config/slack');
const aiConfig = require('./config/ai');
const adminConfig = require('./config/admin-users');
const aiService = require('./services/aiService');
const knowledgeBase = require('./services/knowledgeBase');
const conversationManager = require('./services/conversationManager');
const freshservice = require('./services/freshservice');
const appHomeView = require('./views/appHome');
const modalViews = require('./views/modals');
const messageViews = require('./views/messages');

// Initialize App
const app = new App({
    token: config.slackBotToken,
    signingSecret: config.slackSigningSecret,
    socketMode: true,
    appToken: config.slackAppToken,
    port: config.port
});

let botUserId = null;

// --- Debug Logging ---
app.use(async ({ body, next }) => {
    const logMsg = `[${new Date().toISOString()}] RECEIVED: ${JSON.stringify(body, null, 2)}\n`;
    fs.appendFileSync('debug_events.log', logMsg);

    if (body.type === 'event_callback') {
        console.log('--- EVENT TYPE:', body.event.type, '---');
        if (body.event.type === 'message') {
            console.log('RAW MESSAGE:', JSON.stringify(body.event, null, 2));
        }
    }
    await next();
});

// Start App & Check Identity
(async () => {
    try {
        const auth = await app.client.auth.test();
        botUserId = auth.user_id;
        console.log(`✅ Bot is online: ${auth.user} (ID: ${botUserId}) on Team: ${auth.team}`);
        await app.start();
        logProcess(`⚡️ Slack Helpdesk Bot started and listening (BotID: ${botUserId})`);
        console.log('⚡️ Slack Helpdesk Bot is running!');
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
    }
})();

// Load Knowledge Base
(async () => {
    await knowledgeBase.loadArticles();
})();

// --- Logging Utility ---
const logProcess = (msg) => {
    fs.appendFileSync('debug_events.log', `[${new Date().toISOString()}] PROCESS: ${msg}\n`);
};

// --- Event Handlers ---

// --- Shared Logic ---

/**
 * Shared message processing logic for DMs and Channel Mentions
 */
async function processMessage(text, userId, channelId, say, client, logger) {
    // Helper for channel-aware responses
    const isDM = channelId.startsWith('D'); // DMs usually start with D, but using channel_type is better if available.
    // However, channelId is passed from app_mention (C...) or app.message (D...).

    const smartSay = async (args) => {
        try {
            if (typeof args === 'string') args = { text: args };
            if (isDM) {
                return await say(args);
            } else {
                // In channels, use Ephemeral messages for privacy
                return await client.chat.postEphemeral({
                    channel: channelId,
                    user: userId,
                    ...args
                });
            }
        } catch (err) {
            console.error("Error in smartSay:", err);
            // Fallback to regular say if ephemeral fails
            try {
                return await say(args);
            } catch (err2) {
                console.error("Final fallback say failed:", err2);
            }
        }
    };

    try {
        logProcess(`Processing message from ${userId} in ${channelId}: "${text}"`);
        const state = conversationManager.getConversationState(userId);

        // --- 0. Handle Data Gathering States ---
        if (state.state === 'AWAITING_EMP_ID') {
            const empId = text.trim();
            logProcess(`Gathered Employee ID: ${empId}`);

            const pendingData = { ...state.pendingTicketData, empId };

            // Check if we also need Hostname (Non-biometric system issues)
            if (pendingData.type !== 'biometric') {
                conversationManager.updateConversationState(userId, {
                    state: 'AWAITING_HOSTNAME',
                    pendingTicketData: pendingData
                });
                await smartSay({
                    text: "Got it. Now, could you please provide your *System Hostname*? \n\n_Tip: To find it, type `hostname` in your terminal/command prompt or check the sticker on your machine._"
                });
                return;
            } else {
                // Biometric only needs Emp ID
                return await finalizeTicket(pendingData, userId, channelId, smartSay, say, client);
            }
        }

        if (state.state === 'AWAITING_HOSTNAME') {
            const hostname = text.trim();
            logProcess(`Gathered Hostname: ${hostname}`);

            const pendingData = { ...state.pendingTicketData, hostname };
            return await finalizeTicket(pendingData, userId, channelId, smartSay, say, client);
        }

        // 1. Detect Intent
        const intent = await aiService.detectIntent(text);
        logProcess(`Intent detected: ${JSON.stringify(intent)}`);

        // 2. Handle specific actions
        const isTicketRequest = text.toLowerCase().includes('ticket') || text.toLowerCase().includes('raise') || intent.action === 'create_ticket';

        if (isTicketRequest) {
            // Initiate data gathering flow instead of immediate creation
            conversationManager.updateConversationState(userId, {
                state: 'AWAITING_EMP_ID',
                pendingTicketData: {
                    subject: `Support Request: ${intent.issue_type || 'General'}`,
                    description: `User message: ${text}`,
                    type: intent.issue_type,
                    originalText: text
                }
            });

            await say({
                channel: channelId,
                text: `I'll help you raise a ticket for that. First, could you please provide your **Employee ID**?`
            });
            return;
        }

        // 3. Handle troubleshooting
        if (intent.needs_troubleshooting || intent.action === 'troubleshoot' || (!intent.direct_answer && !isTicketRequest)) {
            // Find relevant article
            let article = knowledgeBase.findArticle(intent.issue_type);

            // If AI suggested an article, try to find that one specifically
            if (intent.suggested_article) {
                const specificArticle = knowledgeBase.getAllArticles().find(a =>
                    a.title.toLowerCase().includes(intent.suggested_article.toLowerCase()) ||
                    a.id.includes(intent.suggested_article)
                );
                if (specificArticle) article = specificArticle;
            }

            if (!article) {
                // Generate dynamic steps if no article found
                try {
                    await smartSay({
                        text: "Troubleshooting Steps",
                        blocks: [
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": "I don't have a specific guide for that, but let me generate some troubleshooting steps for you..."
                                }
                            }
                        ]
                    });

                    // Add a timeout to the AI generation
                    let dynamicSteps;
                    try {
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('AI Generation Timeout')), 15000)
                        );
                        dynamicSteps = await Promise.race([
                            aiService.generateDynamicSteps(text),
                            timeoutPromise
                        ]);
                    } catch (error) {
                        console.error("Dynamic steps failed or timed out:", error.message);
                        dynamicSteps = await aiService.generateDynamicSteps(text, true); // Force fallback if needed
                    }

                    if (dynamicSteps && dynamicSteps.length > 0) {
                        article = {
                            id: `dynamic_${Date.now()}`,
                            title: `Dynamic Help: ${text.slice(0, 30)}`,
                            steps: dynamicSteps
                        };
                    }
                } catch (err) {
                    console.error("Error generating dynamic steps:", err);
                }
            }

            // Start Troubleshooting Flow if we have an article with steps
            if (article && article.steps && article.steps.length > 0) {
                conversationManager.updateConversationState(userId, {
                    step: 1,
                    currentArticle: article,
                    ticketCreated: false,
                    attempts: 0 // Reset attempts for new session
                });

                const step = article.steps[0];
                await smartSay({
                    text: `I can help with that! Let's troubleshoot this.`,
                    blocks: messageViews.troubleshootingStep(step.instruction, 1, article.steps.length, article.id)
                });
                return;
            } else {
                // Final fallback: Create ticket if no steps found/generated
                conversationManager.updateConversationState(userId, {
                    state: 'AWAITING_EMP_ID',
                    pendingTicketData: {
                        subject: `No Steps Found: ${text.slice(0, 30)}`,
                        description: `Could not generate or find steps for user request: ${text}`,
                        type: 'General'
                    }
                });

                await say({
                    channel: channelId,
                    text: "I attempted to find troubleshooting steps but couldn't identify a specific solution. I'll help you raise a ticket for this. First, could you please provide your **Employee ID**?"
                });
                return;
            }
        } else {
            // Direct Answer
            let response;
            if (intent.direct_answer) {
                response = intent.direct_answer;
            } else {
                response = await aiService.generateResponse(text, conversationManager.getConversationState(userId).history);
            }
            await smartSay({
                text: response,
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": response
                        }
                    },
                    {
                        "type": "actions",
                        "elements": [
                            {
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "text": "🎫 Still need help? Raise a Ticket",
                                    "emoji": true
                                },
                                "action_id": "report_issue"
                            }
                        ]
                    }
                ]
            });
        }

        // Update history
        conversationManager.addMessageToHistory(userId, 'user', text);
    } catch (error) {
        logger.error("Error processing message:", error);
        await say({
            channel: channelId,
            text: "I'm sorry, I encountered an unexpected error while processing your request. I'll notify our IT team."
        });
    }
}

/**
 * Finalize ticket creation after gathering all data
 */
async function finalizeTicket(data, userId, channelId, smartSay, say, client) {
    try {
        // Fetch user info from Slack
        let requesterName = "Unknown User";
        let requesterEmail = "user@example.com";
        try {
            const userInfo = await client.users.info({ user: userId });
            if (userInfo.ok) {
                requesterName = userInfo.user.real_name || userInfo.user.name;
                requesterEmail = userInfo.user.profile.email || requesterEmail;
            }
        } catch (err) {
            console.error("Error fetching user info:", err);
        }

        const ticketDescription = `
User Data:
- Employee ID: ${data.empId}
- System Hostname: ${data.hostname || 'N/A (Biometric Issue)'}

Original Issue:
${data.description}
        `.trim();

        const ticket = await freshservice.createTicket({
            subject: data.subject,
            description: ticketDescription,
            email: requesterEmail,
            name: requesterName
        });

        // Use say (public) for ticket confirmation so team knows
        await say({
            channel: channelId,
            blocks: messageViews.ticketCreated(ticket.id)
        });

        // Clear state
        conversationManager.clearConversationState(userId);
    } catch (error) {
        console.error("Error finalizing ticket:", error);
        await smartSay("I'm sorry, I encountered an error while finalizing your ticket. Please try again or contact IT support.");
    }
}

// --- Event Handlers ---

// App Home Opened
app.event('app_home_opened', async ({ event, client, logger }) => {
    try {
        const homeView = appHomeView.createAppHomeView(event.user, "User");
        await client.views.publish({
            user_id: event.user,
            view: homeView
        });
    } catch (error) {
        logger.error(error);
    }
});

// Helper to clean mentions and check if bot was tagged
function getMessageInfo(text) {
    if (!botUserId) return { text, isMentioned: false };
    const botMentionRegex = new RegExp(`<@${botUserId}>`, 'g');
    const isMentioned = botMentionRegex.test(text);
    const cleanedText = text.replace(botMentionRegex, '').trim();
    return { cleanedText, isMentioned };
}

// App Mention Context (Channels)
app.event('app_mention', async ({ event, say, client, logger }) => {
    logProcess(`app_mention triggered! Text: ${event.text}`);
    const { cleanedText } = getMessageInfo(event.text);
    // Add a flag to the event to signal it's handled (useful if combined with message event)
    event.is_handled_as_mention = true;
    await processMessage(cleanedText, event.user, event.channel, say, client, logger);
});

// Message Context (DMs and Proactive Channels)
app.message(async ({ message, say, client, logger }) => {
    logProcess(`app.message triggered! Channel: ${message.channel}, Type: ${message.channel_type}, BotID: ${message.bot_id}`);
    console.log(`DEBUG: app.message triggered! Channel: ${message.channel}, Type: ${message.channel_type}, BotID: ${message.bot_id}`);

    // Ignore bot messages
    if (message.bot_id) return;

    // Ignore messages that are handled via app_mention to prevent double-replies
    // Note: Bolt usually triggers both if the bot is mentioned in a channel
    const { cleanedText, isMentioned } = getMessageInfo(message.text || "");
    if (isMentioned && message.channel_type !== 'im') return;

    const userId = message.user;
    const channelId = message.channel;
    const state = conversationManager.getConversationState(userId);
    const isInConversation = state.state !== 'IDLE' || state.currentArticle !== null;
    const isDM = message.channel_type === 'im';

    // Proceed if:
    // 1. It's a DM
    // 2. We are already in a conversation (gathering info or troubleshooting)
    // 3. Proactive check (AI thinks it's an IT issue)
    if (isDM || isInConversation) {
        return await processMessage(cleanedText, userId, channelId, say, client, logger);
    }

    // Proactive Support
    try {
        const intent = await aiService.detectIntent(cleanedText);
        logProcess(`Proactive intent check for "${cleanedText}": ${JSON.stringify(intent)}`);
        if (intent.action === 'troubleshoot' || intent.action === 'create_ticket' || intent.needs_troubleshooting || (intent.action === 'answer' && intent.direct_answer)) {
            return await processMessage(cleanedText, userId, channelId, say, client, logger);
        }
    } catch (err) {
        console.error("Proactive intent check failed:", err);
    }
});


// --- Action Handlers ---

// Button: Report Issue
app.action('report_issue', async ({ body, client, ack }) => {
    await ack();
    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view: modalViews.reportIssueModal(body.trigger_id)
        });
    } catch (error) {
        console.error(error);
    }
});

// Button: Step Solved
app.action('step_solved', async ({ body, ack, say, client }) => {
    await ack();
    const userId = body.user.id;
    const channelId = body.channel.id;
    const isDM = channelId.startsWith('D');

    const msg = `Great! I'm glad we could resolve that for you. Let me know if you need anything else!`;

    if (isDM) {
        await say(msg);
    } else {
        await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: msg
        });
    }
    conversationManager.clearConversationState(userId);
});

// Button: Step Failed
app.action('step_failed', async ({ body, ack, say, action, client }) => {
    await ack();
    const userId = body.user.id;
    const channelId = body.channel.id;
    const isDM = channelId.startsWith('D');
    const state = conversationManager.getConversationState(userId);
    const value = JSON.parse(action.value);
    const article = state.currentArticle;

    const smartSay = async (args) => {
        if (typeof args === 'string') args = { text: args };
        if (isDM) {
            return await say(args);
        } else {
            return await client.chat.postEphemeral({
                channel: channelId,
                user: userId,
                ...args
            });
        }
    };

    if (!article) {
        await smartSay("Something went wrong with your session. Please try again.");
        return;
    }

    const nextStepIndex = value.step; // current step index (1-based in UI, so this is effectively next index)

    // Requirement: Create ticket after 5 steps if unresolved
    // Using a simple counter in session state
    const attempts = (state.attempts || 0) + 1;
    conversationManager.updateConversationState(userId, { attempts });

    // Check if max steps (5) reached or no more steps in the article
    if (attempts >= 5 || nextStepIndex >= article.steps.length) {
        // Auto-initiate gathering instead of immediate creation
        if (!state.ticketCreated) {
            const reason = attempts >= 5 ? "Reached maximum troubleshooting steps" : "No more steps in guide";

            conversationManager.updateConversationState(userId, {
                state: 'AWAITING_EMP_ID',
                pendingTicketData: {
                    subject: `Unresolved Issue: ${article.title}`,
                    description: `User attempted troubleshooting for ${article.title} but was not resolved after ${attempts} steps.\n\nSummary: ${reason}`,
                    type: article.issue_type || 'General'
                }
            });

            await say(`It looks like we haven't been able to resolve this yet (${reason}). I'll help you raise a support ticket. First, could you please provide your **Employee ID**?`);
        }
    } else {
        // Show next step
        const nextStep = article.steps[nextStepIndex];
        conversationManager.updateConversationState(userId, { step: nextStepIndex + 1 });

        await smartSay({
            text: `Let's try the next step.`,
            blocks: messageViews.troubleshootingStep(nextStep.instruction, nextStepIndex + 1, article.steps.length, article.id)
        });
    }
});

// Modal Submission
app.view('submit_issue', async ({ ack, body, view, client }) => {
    await ack();
    const description = view.state.values.issue_description_block.issue_description.value;
    const topic = view.state.values.issue_type_block.issue_type.selected_option.text.text;
    const userId = body.user.id;

    try {
        // Create ticket
        const ticket = await freshservice.createTicket({
            subject: `New Issue: ${topic}`,
            description: description,
            email: "user@example.com"
        });

        await client.chat.postMessage({
            channel: userId,
            blocks: messageViews.ticketCreated(ticket.id)
        });

    } catch (error) {
        console.error(error);
        await client.chat.postMessage({
            channel: userId,
            text: "There was an error creating your ticket. Please try again later."
        });
    }
});


// End of App Logic
