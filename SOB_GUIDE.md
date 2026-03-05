# Standard Operating Book (SOB): AI-Powered Slack Helpdesk & Travel Bot

Welcome to the **Standard Operating Book (SOB)**! This document is designed to help any new user, developer, or stakeholder understand the bot's journey, its current capabilities, and how to maintain it.

---

## 1. Introduction
The **AI-Powered Slack IT Helpdesk & Travel Bot** is an enterprise-grade solution built to bridge the gap between Slack communication and IT/Travel management. It uses cutting-edge AI (Gemini/OpenAI) to handle natural language queries, automates troubleshooting via an article-based knowledge base, and integrates seamlessly with Freshservice for ticket management.

---

## 2. The Development Journey (Timeline)

### 🚀 Phase 1: Foundation (The Vision)
- **Goal**: Establish a modular Slack-first framework.
- **Key Actions**: Chose **Slack Bolt.js (Node.js)**; set up `services/` for AI, Freshservice, and KB integration; implemented `parsers/` for document reading.
- **Result**: A bot that can "read" SOPs and answer questions via Gemini/OpenAI.

### 🎨 Phase 2: User Experience & Self-Service
- **Goal**: Make help accessible and interactive.
- **Key Actions**: Built the **App Home Dashboard**; implemented a **5-step troubleshooting escalation** rule (try solving locally first, then offer a ticket).
- **Result**: Reduced manual ticket load by empowering users to self-solve.

### 🏢 Phase 3: Enterprise Integration (Freshservice)
- **Goal**: Connect Slack flow to formal IT processes.
- **Key Actions**: Integrated Freshservice API; mapped Slack users to Freshservice requesters; built interactive modals for smart ticket creation.
- **Result**: Context-rich tickets created directly from Slack conversations.

### ✈️ Phase 4: Automation (Travel & Quick Tickets)
- **Goal**: Expand beyond IT support.
- **Key Actions**: Added **Smart Travel Assistant** (approvals/VIP logic); implemented **Quick Tickets** for common requests (e.g., Biometric Access); added **Web Check-in Automation**.
- **Result**: Significant processing time saved for repetitive corporate tasks.

### 🛡️ Phase 5: Production & Scalability
- **Goal**: 24/7 reliability and data privacy.
- **Key Actions**: Deployed on Ubuntu; integrated **PM2** for process management; added **Ollama** support for local LLM privacy; established rigorous health check protocols.

---

## 3. Current Project Status
- **Health**: Operational (Production).
- **Active Integrations**: Slack (Socket Mode), Freshservice API, Google Gemini / OpenAI, Ollama (Local).
- **Key Features Live**:
    - AI natural language chat.
    - Automatic SOP searching (articles directory).
    - Freshservice ticket lifecycle management.
    - App Home dashboard.
    - Corporate travel request flow.
    - Web check-in automation.

---

## 4. System Architecture

### 🛠 Tech Stack
- **Backend**: Node.js (v18+)
- **Framework**: Slack Bolt.js
- **Database**: File-based (Knowledge articles) + Freshservice (Tickets)
- **AI Models**: Google Gemini Pro / OpenAI GPT-4 / Ollama (Llama3)

### 📂 Key Folders & Files
- [`app.js`](file:///home/nithyananthan/Desktop/Slack_bot/slack-ai-helpdesk-bot/app.js): Main entry point (events & routing).
- [`services/`](file:///home/nithyananthan/Desktop/Slack_bot/slack-ai-helpdesk-bot/services/): Business logic for AI, FS, and KB.
- [`articles/`](file:///home/nithyananthan/Desktop/Slack_bot/slack-ai-helpdesk-bot/articles/): The brain of the bot (Troubleshooting JSON/MD files).
- [`views/`](file:///home/nithyananthan/Desktop/Slack_bot/slack-ai-helpdesk-bot/views/): Slack interactive UI templates (App Home, Modals).
- [`parsers/`](file:///home/nithyananthan/Desktop/Slack_bot/slack-ai-helpdesk-bot/parsers/): Tools to extract data from PDFs and Word docs.

---

## 5. User Access Guide (How to use the Bot)

### 📲 Accessing the Bot in Slack
1.  **Find the Bot**: Go to the **"Apps"** section in your Slack sidebar.
2.  **Open Home Tab**: Click on **"IT Helpdesk Bot"**. The first thing you'll see is the **App Home Dashboard**.
3.  **Start a Chat**: Head to the **"Messages"** tab to start a direct conversation with the AI.

### 🛠 Ways to Interact
-   **Natural Chat**: Just type your problem (e.g., "My printer isn't working").
-   **App Home Buttons**:
    -   **"Report an Issue"**: Opens a form to create a ticket directly.
    -   **"Knowledge Base"**: Let's you browse troubleshooting articles manually.
    -   **"My Tickets"**: Shows your active Freshservice tickets and their status.
-   **Command**: Type `/it-help` or `/travel` (if enabled) in any channel to invoke specific features.

---

## 6. Onboarding for New Developers

### Quick Setup (Local Development)
1.  **Clone**: `git clone <repo-url>`
2.  **Install**: `npm install`
3.  **Config**: Create `.env` from `.env.example` (Tokens needed: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `GEMINI_API_KEY`).
4.  **Run**: `npm run dev`

---

## 7. SOP: Maintenance & Troubleshooting (Problem Fixing)

If the bot is not responding correctly or users report errors, follow this **Standard Operating Procedure (SOP)**:

### 🔍 Phase 1: Immediate Health Check (High Level)
1.  **Server Connectivity**: Ensure the Ubuntu server is reachable (`ssh` or ping).
2.  **Process Status**: Run `pm2 status`. 
    -   If status is **'online'**, proceed to log analysis.
    -   If status is **'errored'** or **'stopped'**, run: `pm2 restart slack-helpdesk-bot`.

### 📝 Phase 2: Systematic Troubleshooting (Deep Dive)
If the process is online but the bot is failing:

**Step 1: Check Real-time Events**
Run `tail -f debug_events.log`. This shows every event hitting the bot from Slack. If you see no events when you type in Slack, the **Socket Connection** is broken.
*   **Fix**: Check server internet or verify `SLACK_APP_TOKEN` in `.env`.

**Step 2: Check Error Stack Traces**
Run `pm2 logs slack-helpdesk-bot --err`. Look for "Uncaught Error" or "API Error".
*   **Fix**: Update the specific service (AI, Freshservice, etc.) based on the error message.

**Step 3: Verify Environment Variables**
Check `.env` (carefully) to ensure no keys have expired or been changed.
*   **Fix**: Re-generate keys from Slack App Config or Freshservice Admin Panel.

### 🚨 Problem-Fixing Matrix
| Problem | Signs | Fix Action |
| :--- | :--- | :--- |
| **Bot is Silent** | No logs in `debug_events.log` | Restart PM2; verify Socket Mode is ON in Slack API. |
| **"Dispatch Failed"** | Red error message in Slack | `npm install` (missing deps) or check `SLACK_SIGNING_SECRET`. |
| **AI gives "I don't know"** | AI replies with generic message | Add a JSON file to `articles/` covering that topic. |
| **Ticket Creation Fails** | 401/403 Error in PM2 logs | Verify `FRESHSERVICE_API_KEY` and Permissions in FS. |
| **App Home is Blank** | Button clicks do nothing | Ensure Interactivity is enabled in Slack API Dashboard. |

---

## 8. Future Roadmap
- **Slack Workflows**: Integrate directly with Slack's built-in workflow builder.
- **Reporting Dashboard**: Dynamic analytics on ticket resolution speed.
- **Voice-to-Ticket**: Support for voice memos in Slack.

---
*Created by Antigravity on 2026-02-27*
