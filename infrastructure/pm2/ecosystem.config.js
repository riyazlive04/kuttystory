// ──────────────────────────────────────────────────────────────
// PM2 Ecosystem Configuration for Kutty Story
// ──────────────────────────────────────────────────────────────

module.exports = {
  apps: [
    {
      name: 'kutty-story-web',
      cwd: '/var/www/kutty-story/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start --port 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/kutty-story/web-error.log',
      out_file: '/var/log/kutty-story/web-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Log rotation
      max_size: '50M',
      retain: 10,
    },
    {
      name: 'kutty-story-admin',
      cwd: '/var/www/kutty-story/apps/admin',
      script: 'node_modules/.bin/next',
      args: 'start --port 3001',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/kutty-story/admin-error.log',
      out_file: '/var/log/kutty-story/admin-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_size: '50M',
      retain: 10,
    },
    {
      name: 'kutty-story-api',
      cwd: '/var/www/kutty-story/apps/api',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: '/var/log/kutty-story/api-error.log',
      out_file: '/var/log/kutty-story/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_size: '100M',
      retain: 10,
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 10000,
      // Restart delay to stagger cluster restarts
      restart_delay: 3000,
    },
  ],
};
