# Freshservice Webhook Setup Guide

## Overview
This guide will help you configure Freshservice to automatically send webhook notifications to your Slack bot when tickets are updated. This enables automatic private DM notifications for domain lock and password reset tickets.

---

## Prerequisites

✅ Freshservice Admin access  
✅ Bot server IP address or domain name  
✅ Bot is running on port 3000  
✅ Your automation is already processing domain lock/password reset tickets

---

## Step-by-Step Configuration

### Step 1: Get Your Webhook URL

Your webhook endpoint is:
```
http://YOUR_SERVER_IP:3000/freshservice/webhook
```

**Replace `YOUR_SERVER_IP` with your actual server IP or domain.**

Example:
```
http://203.0.113.45:3000/freshservice/webhook
```

---

### Step 2: Login to Freshservice

1. Go to your Freshservice portal: `https://desicrew.freshservice.com`
2. Login with **Admin credentials**
3. Click the **gear icon** (⚙️) in top-right corner → **Admin**

---

### Step 3: Navigate to Workflow Automator

1. In Admin panel, find **"Workflow Automator"** in the left sidebar
2. Click **"Automations"**
3. Click **"New Automation Rule"** button (top-right)

---

### Step 4: Configure the Automation Trigger

#### Event Selection
- **Trigger Name**: `Slack Bot - Ticket Reply Notification`
- **Description**: `Send webhook to Slack bot when notes are added to tickets`
- **Event**: Select **"Ticket is Updated"** or **"Note is Added"**

#### Conditions (Optional but Recommended)
Click **"Add Condition"** to only trigger for specific scenarios:

**Option 1: Trigger only when notes are added**
- Condition: `Notes` → `is not` → `empty`

**Option 2: Trigger only for resolved tickets**
- Condition: `Status` → `is` → `Resolved` or `Closed`

**Option 3: Trigger for specific ticket types (Recommended)**
- Condition: `Subject` → `contains` → `Domain Lock`
- **OR**
- Condition: `Subject` → `contains` → `Password Reset`

---

### Step 5: Add Webhook Action

1. Under **"Actions"**, click **"Add Action"**
2. Select **"Trigger Webhook"**

#### Webhook Configuration

**Request Type**: `POST`

**URL**: 
```
http://YOUR_SERVER_IP:3000/freshservice/webhook
```
(Replace with your actual server IP)

**Content Type**: `application/json`

**Authentication**: None (or Basic Auth if you add it later)

**Request Body**: Copy and paste this JSON exactly:

```json
{
  "ticket": {
    "id": "{{ticket.id}}",
    "ticket_id": "{{ticket.id}}",
    "subject": "{{ticket.subject}}",
    "status": {{ticket.status}},
    "status_name": "{{ticket.status}}",
    "priority": {{ticket.priority}},
    "description_text": "{{ticket.description_text}}",
    "latest_note": "{{ticket.latest_public_note}}",
    "responder_name": "{{ticket.agent.name}}",
    "updated_by": "{{ticket.agent.name}}"
  }
}
```

**Important Notes:**
- ⚠️ Make sure to use **double curly braces** `{{ }}` for placeholders
- ⚠️ Some fields like `{{ticket.status}}` don't need quotes (they're numbers)
- ⚠️ String fields like `"{{ticket.subject}}"` need quotes

---

### Step 6: Save and Activate

1. Click **"Save"** at the bottom
2. **Toggle the automation to "Active"** (switch on the right side)
3. You should see a green status indicator

---

### Step 7: Test the Webhook

#### Method 1: Use Freshservice's Test Feature

1. Find your newly created automation in the list
2. Click the **three dots** (⋮) → **"Test Automation"**
3. Select an existing ticket (preferably one with notes)
4. Click **"Run Test"**
5. Check if the webhook was sent successfully

#### Method 2: Create a Test Ticket

1. Create a test domain lock ticket through your Slack bot
2. Wait for your automation to process it and add a reply (1-2 minutes)
3. Check your Slack - you should receive a private DM with the reply
4. Check bot logs on server:
   ```bash
   pm2 logs slack-helpdesk-bot --lines 50
   ```

---

## Webhook Payload Reference

When Freshservice triggers the webhook, it will send data like this:

```json
{
  "ticket": {
    "id": "33334",
    "subject": "Domain Lock - DC5365",
    "status": 4,
    "status_name": "Resolved",
    "latest_note": "Thank you for reaching out to DC IT Helpdesk. DOMAIN ACCOUNT STATUS CHECKED...",
    "responder_name": "Automation System"
  }
}
```

Your bot will:
1. Receive this webhook
2. Check if ticket is sensitive (domain_lock/password_reset)
3. Fetch full conversation from Freshservice API
4. Send private DM to the user who raised the ticket

---

## Troubleshooting

### Issue 1: Webhook Not Firing

**Check:**
- Automation is **Active** (green toggle)
- Conditions are not too restrictive
- Ticket meets all the conditions you set

**Solution:**
- Temporarily remove all conditions
- Test with any ticket update
- Add conditions back one by one

---

### Issue 2: Bot Not Receiving Webhook

**Check on Server:**
```bash
# Check if bot is listening on port 3000
pm2 logs slack-helpdesk-bot | grep "Webhook endpoint ready"

# Should show:
# 🔗 Webhook endpoint ready at: http://localhost:3000/freshservice/webhook
```

**Test Webhook Endpoint:**
```bash
# From your local machine
curl -X POST http://YOUR_SERVER_IP:3000/freshservice/webhook \
  -H "Content-Type: application/json" \
  -d '{"ticket":{"id":"TEST","subject":"Test"}}'

# Should return: {"message":"No mapping found, ignoring"}
```

**Check Firewall:**
```bash
# On server, check if port 3000 is open
sudo ufw status
sudo ufw allow 3000/tcp
```

---

### Issue 3: User Not Receiving DM

**Check Bot Logs:**
```bash
pm2 logs slack-helpdesk-bot --lines 100 | grep "Processing sensitive ticket"

# Should show:
# 🔐 Processing sensitive ticket 33334 of type domain_lock
# ✅ Sent PRIVATE notification to user U0ADYAUKH7F
```

**Verify Ticket Mapping:**
```bash
# On server
cat ~/DesiCrew_Slack_Bot/data/ticket_user_mappings.json

# Should show ticket with isSensitive: true
```

---

### Issue 4: JSON Errors in Logs

**Symptom:**
```
Error: Unexpected end of JSON input
```

**Fix:**
```bash
cd ~/DesiCrew_Slack_Bot
rm data/ticket_user_mappings.json
echo '{}' > data/ticket_user_mappings.json
pm2 restart slack-helpdesk-bot
```

---

## Testing Checklist

Before going live, test the complete flow:

- [ ] Freshservice automation is **Active**
- [ ] Webhook URL is correct (check server IP/domain)
- [ ] Port 3000 is accessible from internet
- [ ] Bot shows "Webhook endpoint ready" in logs
- [ ] Create a test domain lock ticket via Slack
- [ ] Verify ticket appears in Freshservice
- [ ] Wait for your automation to process (1-2 min)
- [ ] Confirm automation adds reply/note in Freshservice
- [ ] Webhook fires from Freshservice
- [ ] Bot logs show "Processing sensitive ticket"
- [ ] User receives private DM with the reply
- [ ] DM shows the automation response clearly

---

## Advanced Configuration (Optional)

### Add Authentication to Webhook

For extra security, you can add authentication:

1. Generate a secret token
2. In Freshservice webhook config, add **Header**:
   - Name: `X-Webhook-Token`
   - Value: `your-secret-token-here`

3. Update bot code to verify the token in webhook handler

### Multiple Automations

You can create separate automations for:
- Domain Lock tickets only
- Password Reset tickets only
- Other ticket types

Just duplicate the automation and adjust the conditions.

---

## Support

If you encounter issues:

1. **Check bot logs**: `pm2 logs slack-helpdesk-bot`
2. **Check Freshservice logs**: Admin → Automations → View execution history
3. **Test webhook manually**: Use the curl command above
4. **Verify network**: Ensure server port 3000 is accessible

---

## Summary

✅ Freshservice automation triggers when notes are added  
✅ Webhook sends ticket data to your bot  
✅ Bot identifies sensitive tickets (domain_lock/password_reset)  
✅ Bot fetches automation reply from Freshservice  
✅ Bot sends private DM to ticket creator only  
✅ Privacy maintained - only ticket creator sees sensitive info  

**You're all set! 🚀**
