const createAppHomeView = (userId, userName) => {
    return {
        type: 'home',
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Hey <@${userId}>, I'm IT Helpdesk Bot!* 👋\n\nI can help you troubleshoot IT issues and create support tickets. Here are some things I can do:`
                }
            },
            {
                type: 'divider'
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: { type: 'plain_text', text: '🔍 Report an Issue', emoji: true },
                        style: 'primary',
                        action_id: 'report_issue',
                        value: 'report'
                    },
                    {
                        type: 'button',
                        text: { type: 'plain_text', text: '📚 Browse Knowledge Base', emoji: true },
                        action_id: 'browse_kb',
                        value: 'kb'
                    },
                    {
                        type: 'button',
                        text: { type: 'plain_text', text: '🎫 Check My Tickets', emoji: true },
                        action_id: 'check_tickets',
                        value: 'tickets'
                    }
                ]
            },
            {
                type: 'divider'
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*💡 Quick Tips:*\n• Just message me with your issue\n• I\'ll guide you step-by-step\n• If I can\'t solve it, I\'ll create a ticket for you automatically'
                }
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: 'Powered by Advanced AI 🤖'
                    }
                ]
            }
        ]
    };
};

module.exports = { createAppHomeView };
