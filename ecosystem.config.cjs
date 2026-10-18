module.exports = {
  apps: [
    {
      name: "discord-all-in-one-bot",
      script: "src/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production"
      },
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000
    }
  ]
};
