module.exports = {
    apps: [
        {
            name: 'pulse-ops-api',
            script: 'src/server.js',
            instances: 'max', // Use all available CPUs
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'development',
                PORT: 5000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
            error_file: 'logs/pm2-error.log',
            out_file: 'logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '1G',
            autorestart: true,
            watch: false,
            ignore_watch: ['node_modules', 'logs'],
            max_restarts: 10,
            min_uptime: '10s',
        },
    ],
};
