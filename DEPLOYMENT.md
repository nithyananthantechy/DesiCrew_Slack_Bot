# Production Deployment Guide

This guide will help you deploy the Slack IT Helpdesk Bot to your Ubuntu server for 24/7 operation.

## Prerequisites

- Ubuntu Server (18.04 or later)
- Root or sudo access
- Server with at least 1GB RAM
- Node.js 16.x or later

---

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Install Node.js (if not already installed)
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.3 Install PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

---

## Step 2: Deploy Application

### 2.1 Create Application Directory
```bash
# Create directory for the bot
sudo mkdir -p /opt/slack-helpdesk-bot
sudo chown $USER:$USER /opt/slack-helpdesk-bot
cd /opt/slack-helpdesk-bot
```

### 2.2 Transfer Files to Server

**Option A: Using SCP (from your local machine)**
```bash
# From your local machine, run:
scp -r /home/nithyananthan/Desktop/Slack_bot/slack-ai-helpdesk-bot/* user@your-server-ip:/opt/slack-helpdesk-bot/
```

**Option B: Using Git (recommended)**
```bash
# On the server:
cd /opt/slack-helpdesk-bot
git clone <your-repo-url> .
# OR if you haven't set up git yet, use SCP method above
```

### 2.3 Install Dependencies
```bash
cd /opt/slack-helpdesk-bot
npm install --production
```

### 2.4 Configure Environment Variables
```bash
# Copy the .env file (make sure it has production values)
nano .env
```

**Important: Verify these values in your .env:**
- `SLACK_BOT_TOKEN` - Your production bot token
- `SLACK_APP_TOKEN` - Your production app token
- `SLACK_SIGNING_SECRET` - Your production signing secret
- `GEMINI_API_KEY` - Your Gemini API key
- `FRESHSERVICE_DOMAIN` - Your Freshservice domain
- `FRESHSERVICE_API_KEY` - Your Freshservice API key

---

## Step 3: Start Bot with PM2

### 3.1 Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

Paste this configuration:
```javascript
module.exports = {
  apps: [{
    name: 'slack-helpdesk-bot',
    script: 'app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 3.2 Create Logs Directory
```bash
mkdir -p logs
```

### 3.3 Start the Bot
```bash
# Start the bot using PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs slack-helpdesk-bot

# View real-time logs
pm2 logs slack-helpdesk-bot --lines 100
```

---

## Step 4: Configure Auto-Start on Server Reboot

### 4.1 Generate PM2 Startup Script
```bash
# Generate startup script
pm2 startup

# This will output a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user
# Copy and run that command
```

### 4.2 Save PM2 Process List
```bash
# Save current PM2 processes
pm2 save

# This ensures the bot starts automatically after server reboot
```

### 4.3 Test Auto-Start (Optional)
```bash
# Reboot server
sudo reboot

# After reboot, SSH back in and check:
pm2 list
# Your bot should be running automatically
```

---

## Step 5: Monitoring & Maintenance

### 5.1 PM2 Commands Reference
```bash
# View all running processes
pm2 list

# View logs
pm2 logs slack-helpdesk-bot

# Restart bot
pm2 restart slack-helpdesk-bot

# Stop bot
pm2 stop slack-helpdesk-bot

# Delete from PM2
pm2 delete slack-helpdesk-bot

# Monitor CPU/Memory usage
pm2 monit

# View detailed info
pm2 info slack-helpdesk-bot
```

### 5.2 Update Bot (When You Make Changes)
```bash
# Stop the bot
pm2 stop slack-helpdesk-bot

# Pull latest changes (if using git)
git pull

# Or upload new files via SCP
# scp -r local-files/* user@server:/opt/slack-helpdesk-bot/

# Install any new dependencies
npm install --production

# Restart the bot
pm2 restart slack-helpdesk-bot

# Or reload (zero-downtime restart)
pm2 reload slack-helpdesk-bot
```

### 5.3 View Debug Logs
```bash
# View bot's custom debug logs
tail -f /opt/slack-helpdesk-bot/debug_events.log

# View PM2 logs
pm2 logs slack-helpdesk-bot --lines 200
```

---

## Step 6: Security Best Practices

### 6.1 File Permissions
```bash
# Ensure .env is not readable by others
chmod 600 /opt/slack-helpdesk-bot/.env

# Set proper ownership
sudo chown -R $USER:$USER /opt/slack-helpdesk-bot
```

### 6.2 Firewall Configuration
```bash
# The bot uses Socket Mode, so no inbound ports needed
# But ensure outbound HTTPS (443) is allowed

# If using UFW:
sudo ufw allow out 443/tcp
sudo ufw enable
```

### 6.3 Regular Backups
```bash
# Backup knowledge base and configuration
tar -czf backup-$(date +%Y%m%d).tar.gz /opt/slack-helpdesk-bot/knowledge_base /opt/slack-helpdesk-bot/.env

# Store backups in a safe location
```

---

## Step 7: Health Checks

### 7.1 Create Health Check Script
```bash
nano /opt/slack-helpdesk-bot/health_check.sh
```

```bash
#!/bin/bash
# Health check script

if pm2 list | grep -q "slack-helpdesk-bot.*online"; then
    echo "✅ Bot is running"
    exit 0
else
    echo "❌ Bot is down! Attempting restart..."
    pm2 restart slack-helpdesk-bot
    exit 1
fi
```

```bash
# Make executable
chmod +x /opt/slack-helpdesk-bot/health_check.sh
```

### 7.2 Setup Cron Job for Health Checks (Optional)
```bash
# Edit crontab
crontab -e

# Add this line to check every 5 minutes:
*/5 * * * * /opt/slack-helpdesk-bot/health_check.sh >> /opt/slack-helpdesk-bot/logs/health.log 2>&1
```

---

## Troubleshooting

### Bot Not Starting
```bash
# Check PM2 logs
pm2 logs slack-helpdesk-bot --err

# Check if Node.js is installed
node --version

# Check if dependencies are installed
cd /opt/slack-helpdesk-bot && npm list
```

### Bot Crashes Frequently
```bash
# Check memory usage
pm2 monit

# Increase memory limit in ecosystem.config.js
# Change: max_memory_restart: '1G'

# Check error logs
tail -100 /opt/slack-helpdesk-bot/logs/err.log
```

### Bot Not Responding to Slack
```bash
# Verify environment variables
cat /opt/slack-helpdesk-bot/.env | grep -v API_KEY

# Check debug logs
tail -50 /opt/slack-helpdesk-bot/debug_events.log

# Restart the bot
pm2 restart slack-helpdesk-bot
```

---

## Quick Start Summary

For quick deployment, run these commands in order:

```bash
# 1. Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Create directory and navigate
sudo mkdir -p /opt/slack-helpdesk-bot
sudo chown $USER:$USER /opt/slack-helpdesk-bot
cd /opt/slack-helpdesk-bot

# 3. Upload files (use SCP from local machine)
# scp -r /path/to/local/bot/* user@server:/opt/slack-helpdesk-bot/

# 4. Install dependencies
npm install --production

# 5. Start with PM2
pm2 start app.js --name slack-helpdesk-bot

# 6. Configure auto-start
pm2 startup
pm2 save

# 7. Check status
pm2 status
pm2 logs slack-helpdesk-bot
```

---

## Production Checklist

- [ ] Node.js 16+ installed
- [ ] PM2 installed globally
- [ ] Application files transferred to `/opt/slack-helpdesk-bot`
- [ ] Dependencies installed with `npm install --production`
- [ ] `.env` file configured with production credentials
- [ ] Bot started with PM2
- [ ] PM2 startup script configured
- [ ] PM2 process list saved
- [ ] File permissions secured (`.env` is 600)
- [ ] Health check script created
- [ ] Logs directory created
- [ ] Bot tested in Slack workspace
- [ ] Server reboot tested (auto-start verification)

---

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs slack-helpdesk-bot`
2. Check debug logs: `tail -100 debug_events.log`
3. Verify environment variables in `.env`
4. Ensure Slack app tokens are valid
5. Check server has internet connectivity
