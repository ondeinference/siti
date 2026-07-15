/**
 * PM2 Ecosystem Configuration for Siti AI Landing Page - Production
 *
 * Isolated environment configuration for multi-tenant deployment.
 *
 * Usage:
 *   mkdir -p /home/git/apps/web/sitiai/logs
 *   cd /home/git/apps/web/sitiai
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart siti-web
 *   pm2 logs siti-web
 *
 * Keep the port (3034) aligned in three places:
 *   1. ../.smb/config.toml ([project] entry, `port`)
 *   2. this ecosystem file (PORT)
 *   3. nginx/sitiai.com proxy target (if applicable)
 */

module.exports = {
  apps: [
    {
      name: "siti-web",

      // Runs from the standalone Next.js server entrypoint.
      script: "node",
      args: "server.js",

      cwd: "/home/git/apps/web/sitiai",

      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,

      error_file: "/home/git/apps/web/sitiai/logs/pm2-error.log",
      out_file: "/home/git/apps/web/sitiai/logs/pm2-out.log",
      log_file: "/home/git/apps/web/sitiai/logs/pm2-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      env_production: {
        NODE_ENV: "production",
        // The standalone server reads PORT and HOSTNAME from env.
        PORT: "3034",
        HOSTNAME: "127.0.0.1",

        NEXT_TELEMETRY_DISABLED: "1",
        APP_NAME: "siti-web",
        APP_ID: "siti-web-prod",
      },

      node_args: [
        "--max-old-space-size=2048",
        "--max-http-header-size=16384",
      ].join(" "),

      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
      shutdown_with_message: false,

      vizion: false,
    },
  ],
};
