#!/bin/bash
# Quick deployment script for Ubuntu server

echo "🚀 Slack Helpdesk Bot - Quick Deployment Script"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "❌ Please do not run as root. Run as your regular user with sudo access."
    exit 1
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 already installed: $(pm2 --version)"
fi

# Create application directory
APP_DIR="/opt/slack-helpdesk-bot"
echo "📁 Creating application directory: $APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown $USER:$USER "$APP_DIR"

# Copy files
echo "📋 Copying application files..."
CURRENT_DIR=$(pwd)
cp -r "$CURRENT_DIR"/* "$APP_DIR/" 2>/dev/null || {
    echo "⚠️  Please manually copy files to $APP_DIR"
    echo "   From your local machine, run:"
    echo "   scp -r /path/to/bot/* user@server:$APP_DIR/"
}

cd "$APP_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "   Please create .env file with your production credentials"
    echo "   You can copy from .env.example if available"
fi

# Set proper permissions
chmod 600 .env 2>/dev/null

# Start with PM2
echo "🚀 Starting bot with PM2..."
pm2 start ecosystem.config.js

# Configure auto-start
echo "⚙️  Configuring auto-start on reboot..."
pm2 startup | grep "sudo" | bash
pm2 save

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs slack-helpdesk-bot"
echo "🔄 Restart: pm2 restart slack-helpdesk-bot"
echo ""
echo "⚠️  IMPORTANT: Make sure your .env file has production credentials!"
