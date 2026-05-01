// ─────────────────────────────────────────────────────────────────────────────
//  PM2 process config — runs the Express backend in cluster mode and keeps it
//  alive across crashes / reboots.
//
//  Start:    pm2 start deploy/ecosystem.config.js --env production
//  Reload:   pm2 reload medstore-api          (zero-downtime)
//  Stop:     pm2 stop medstore-api
//  Logs:     pm2 logs medstore-api
//  Status:   pm2 status
//  Save:     pm2 save                         (persists across reboots)
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  apps: [
    {
      name: 'medstore-api',
      cwd: '/var/www/medstore/backend',
      script: 'server.js',

      // 2 workers is the sweet spot for an 8 GB / 2-vCPU VPS — gives a bit of
      // parallelism for Mongo round-trips without thrashing memory. Bump to
      // `max` (uses all cores) when you upgrade to a bigger box.
      instances: 2,
      exec_mode: 'cluster',

      // Restart on crash; back off if it crashes too fast (broken deploy).
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      restart_delay: 4000,

      // Reload (not hard-restart) if memory grows past 600 MB per worker.
      max_memory_restart: '600M',

      // Log files — rotated by pm2-logrotate (install separately if needed:
      //   pm2 install pm2-logrotate
      // ).
      out_file:   '/var/log/medstore/api-out.log',
      error_file: '/var/log/medstore/api-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
