
const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

(async () => {
    try {
        console.log("Testing connection...");
        const auth = await app.client.auth.test();
        console.log("SUCCESS: Connection established!");
        console.log(`Bot: ${auth.user} (ID: ${auth.user_id})`);
        console.log(`Team: ${auth.team}`);

        // Listen for ANY event
        app.event(/.*/, async ({ event }) => {
            console.log("EVENT RECEIVED:", event.type);
        });

        await app.start();
        console.log("Bot started in Socket Mode and waiting for events...");

        // Keep it running for a bit
        setTimeout(() => {
            console.log("Test finished.");
            process.exit(0);
        }, 15000);
    } catch (error) {
        console.error("FAILURE: Connection failed!");
        console.error(error);
        process.exit(1);
    }
})();
