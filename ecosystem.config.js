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
        time: true,
        // Restart on crash
        min_uptime: '10s',
        max_restarts: 10,
        // Cron restart (optional - restart daily at 3 AM)
        cron_restart: '0 3 * * *'
    }]
};
