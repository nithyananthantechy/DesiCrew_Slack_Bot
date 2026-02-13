# Quick Deployment Checklist

Use this checklist when deploying to your Ubuntu server:

## Pre-Deployment
- [ ] Verify `.env` has production credentials (not development tokens)
- [ ] Test bot locally one final time
- [ ] Backup current knowledge base files
- [ ] Note down server IP address and SSH credentials

## Server Setup
- [ ] SSH into Ubuntu server: `ssh user@your-server-ip`
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Node.js 18.x
- [ ] Install PM2 globally: `sudo npm install -g pm2`

## Deployment
- [ ] Create directory: `sudo mkdir -p /opt/slack-helpdesk-bot`
- [ ] Set ownership: `sudo chown $USER:$USER /opt/slack-helpdesk-bot`
- [ ] Transfer files to server (SCP or Git)
- [ ] Navigate to directory: `cd /opt/slack-helpdesk-bot`
- [ ] Install dependencies: `npm install --production`
- [ ] Verify `.env` file exists and has correct values
- [ ] Create logs directory: `mkdir -p logs`

## Start Bot
- [ ] Start with PM2: `pm2 start ecosystem.config.js`
- [ ] Check status: `pm2 status`
- [ ] View logs: `pm2 logs slack-helpdesk-bot --lines 50`
- [ ] Test bot in Slack (send a test message)

## Configure Auto-Start
- [ ] Run: `pm2 startup` and execute the generated command
- [ ] Save PM2 list: `pm2 save`
- [ ] Test reboot (optional): `sudo reboot` then check `pm2 list`

## Post-Deployment
- [ ] Monitor logs for 10 minutes: `pm2 logs slack-helpdesk-bot`
- [ ] Test all bot features in Slack
- [ ] Setup health check cron job (optional)
- [ ] Document server details for team

## Maintenance Commands
```bash
# View status
pm2 status

# View logs
pm2 logs slack-helpdesk-bot

# Restart bot
pm2 restart slack-helpdesk-bot

# Stop bot
pm2 stop slack-helpdesk-bot

# Update bot (after making changes)
cd /opt/slack-helpdesk-bot
git pull  # or upload new files
npm install --production
pm2 restart slack-helpdesk-bot
```

## Troubleshooting
If bot doesn't start:
1. Check PM2 error logs: `pm2 logs slack-helpdesk-bot --err`
2. Verify `.env` file: `cat .env` (check tokens)
3. Check Node.js version: `node --version` (should be 16+)
4. Check dependencies: `npm list`
5. Manually test: `node app.js` (look for errors)

## Emergency Contacts
- Server Admin: _____________
- Slack Workspace Admin: _____________
- Freshservice Admin: _____________
