module.exports = {
    apps: [{
        name: "distribute-zug",
        script: "./distribute_tokens.js",
        env: {
            NO_CONFIRM: "true",  // Skip the 5s confirmation delay for restarts
            NODE_ENV: "production"
        },
        // Prevent immediate restart loops if it fails instantly
        min_uptime: "10s",
        max_restarts: 10,
        // Restart if memory goes crazy (leak protection)
        max_memory_restart: "1G",
        // Logs
        out_file: "./pm2-out.log",
        error_file: "./pm2-error.log",
        merge_logs: true,
        // Watch disable checks to prevent partial file writes triggering restarts
        watch: false
    }]
};
