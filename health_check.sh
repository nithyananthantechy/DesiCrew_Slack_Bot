#!/bin/bash
# Health check script for Slack Helpdesk Bot

BOT_NAME="slack-helpdesk-bot"
LOG_FILE="/opt/slack-helpdesk-bot/logs/health.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running health check..." >> "$LOG_FILE"

if pm2 list | grep -q "$BOT_NAME.*online"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Bot is running" >> "$LOG_FILE"
    exit 0
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Bot is down! Attempting restart..." >> "$LOG_FILE"
    pm2 restart "$BOT_NAME"
    sleep 5
    
    if pm2 list | grep -q "$BOT_NAME.*online"; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Bot restarted successfully" >> "$LOG_FILE"
        exit 0
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Failed to restart bot" >> "$LOG_FILE"
        exit 1
    fi
fi
