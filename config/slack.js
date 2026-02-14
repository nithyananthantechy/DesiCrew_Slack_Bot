require('dotenv').config();

module.exports = {
  slackBotToken: process.env.SLACK_BOT_TOKEN,
  slackAppToken: process.env.SLACK_APP_TOKEN,
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  port: process.env.PORT || 3000,
  webhookPort: process.env.WEBHOOK_PORT || 3000
};
