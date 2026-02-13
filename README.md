# AI-Powered Slack IT Helpdesk Bot

A professional, AI-powered Slack bot that integrates with Gemini/OpenAI for natural language processing, manages a document-based knowledge base for troubleshooting, and creates tickets in Freshservice when issues are unresolved.

## Features
- **AI-Powered Conversational Support**: Integrates with Google Gemini or OpenAI to answer user questions naturally.
- **Document-Based Troubleshooting**: Upload troubleshooting articles (Word, PDF, JSON, Markdown) for the bot to use.
- **Intelligent Step Tracking**: Tracks troubleshooting steps and automatically escalates to a ticket after 5 unsuccessful attempts.
- **Freshservice Integration**: Creates tickets in Freshservice with full context from the conversation.
- **App Home Dashboard**: Interactive App Home with buttons for reporting issues, browsing the knowledge base, and checking tickets.

## Prerequisites
- Node.js (v16 or higher)
- A Slack Workspace with permissions to create apps
- Google Gemini API Key OR OpenAI API Key
- Freshservice Account (for ticket creation)

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd slack-ai-helpdesk-bot
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    - Copy `.env.example` to `.env`.
    - Fill in your API keys and tokens in `.env`.

## Slack App Configuration (Critical Step)

1.  **Create App**: Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app "From scratch". Name it "IT Helpdesk Bot".
2.  **Bot Scopes**: Go to **OAuth & Permissions** and add the following **Bot Token Scopes**:
    - `chat:write`
    - `chat:write.public`
    - `im:write`
    - `im:read`
    - `im:history`
    - `users:read`
    - `app_mentions:read`
    - `commands`
3.  **Socket Mode**: Go to **Socket Mode** and enable it. You'll need to generate an App-Level Token (`xapp-...`). Save this as `SLACK_APP_TOKEN` in your `.env`.
4.  **Event Subscriptions**:
    - Enable Events.
    - Subscribe to bot events: `message.im`, `app_home_opened`.
5.  **App Home**:
    - Go to **App Home**.
    - Enable "Home Tab".
    - Enable "Messages Tab".
6.  **Interactivity**: toggle "Interactivity & Shortcuts" to On. Use any URL (e.g. `http://localhost:3000/slack/events`) as Request URL since we are using Socket Mode (it might not be required but good to have enabled).
7.  **Install App**: Go to **Install App** and install it to your workspace. Copy the `Bot User OAuth Token` (`xoxb-...`) to `SLACK_BOT_TOKEN` in `.env`.

## Running the Bot

Start the bot locally:
```bash
npm start
```
For development with auto-restart:
```bash
npm run dev
```

The bot should now be online in your Slack workspace! Click on "IT Helpdesk Bot" in the Apps section to see the Home Tab.

## Adding Knowledge Base Articles
Add your troubleshooting guides to the `articles/` directory. Supported formats:
- `.json` (Recommended for structured steps)
- `.md` (Markdown)
- `.pdf` (Text extraction)
- `.docx` (Text extraction)
- `.txt` (Plain text)

## Troubleshooting
- **Bot not responding?** Check your console for errors. Ensure `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` are correct.
- **AI not working?** Verify your `GEMINI_API_KEY` or `OPENAI_API_KEY`.
- **Tickets not creating?** Check `FRESHSERVICE_DOMAIN` and `FRESHSERVICE_API_KEY`.
