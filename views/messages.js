/**
 * Welcome message block
 */
const welcomeMessage = (userId) => {
    return [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `Hi there! I'm your IT Helpdesk Assistant. How can I help you today?`
            }
        }
    ];
};

/**
 * Step-by-step troubleshooting message
 * @param {string} stepText 
 * @param {number} currentStep 
 * @param {number} totalSteps 
 * @param {string} articleId
 */
const troubleshootingStep = (stepText, currentStep, totalSteps, articleId) => {
    return [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: `Troubleshooting Step ${currentStep}/${totalSteps}`,
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: stepText
            }
        },
        {
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "✅ It worked!",
                        emoji: true
                    },
                    style: "primary",
                    action_id: "step_solved",
                    value: JSON.stringify({ articleId, step: currentStep })
                },
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "❌ Still having issues",
                        emoji: true
                    },
                    style: "danger",
                    action_id: "step_failed",
                    value: JSON.stringify({ articleId, step: currentStep })
                }
            ]
        }
    ];
};

/**
 * Ticket created confirmation
 * @param {string} ticketId 
 */
const ticketCreated = (ticketId) => {
    return [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `I've created a support ticket for you. *Ticket #${ticketId}*`
            }
        },
        {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: "An IT support agent will reach out to you shortly."
                }
            ]
        }
    ];
};

module.exports = {
    welcomeMessage,
    troubleshootingStep,
    ticketCreated
};
