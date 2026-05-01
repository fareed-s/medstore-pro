#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  MedStore Pro — deploy / redeploy script
#
#  Run as the `medstore` user from the repo root:
#      cd /var/www/medstore && bash deploy/deploy.sh
#
#  What this does:
#    1. Pulls latest code (if it's a git checkout)
#    2. Installs backend deps (npm ci) and frontend deps + builds
#    3. Ensures Mongo container is running (docker compose up -d)
#    4. Reloads PM2 backend (zero-downtime)
#    5. Reloads Nginx
#
#  First-time only: read deploy/DEPLOY.md for the full bootstrap sequence
#  (creating env files, seeding the DB, etc).
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/medstore}"
cd "$REPO_DIR"

echo "▶ Pulling latest code"
if [[ -d .git ]]; then
  git fetch --all
  git reset --hard origin/main
fi

# ── MongoDB (Docker) ────────────────────────────────────────────────────────
if [[ ! -f deploy/.env ]]; then
  echo "✖ deploy/.env not found. Copy deploy/env.mongo.example to deploy/.env and fill in MONGO_USER / MONGO_PASS."
  exit 1
fi

echo "▶ Ensuring Mongo container is running"
docker compose --env-file deploy/.env -f deploy/docker-compose.mongo.yml up -d

# Wait for Mongo to be healthy before backend tries to connect.
echo -n "  waiting for Mongo"
for i in {1..30}; do
  if docker exec medstore-mongo mongosh --quiet --eval "db.runCommand('ping').ok" > /dev/null 2>&1; then
    echo " ✓"; break
  fi
  echo -n "."; sleep 1
done

# ── Backend ─────────────────────────────────────────────────────────────────
if [[ ! -f backend/.env ]]; then
  echo "✖ backend/.env not found. Copy deploy/env.backend.example to backend/.env and fill it in."
  exit 1
fi

echo "▶ Installing backend deps"
cd backend
npm ci --omit=dev
cd ..

# ── Frontend build ──────────────────────────────────────────────────────────
echo "▶ Building frontend"
cd frontend
npm ci
npm run build
cd ..

# ── Logs dir for PM2 ────────────────────────────────────────────────────────
sudo mkdir -p /var/log/medstore
sudo chown medstore:medstore /var/log/medstore

# ── PM2 ─────────────────────────────────────────────────────────────────────
echo "▶ Reloading PM2"
if pm2 describe medstore-api > /dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.js --update-env
else
  pm2 start deploy/ecosystem.config.js
fi
pm2 save

# ── Nginx ───────────────────────────────────────────────────────────────────
echo "▶ Reloading Nginx"
sudo nginx -t && sudo systemctl reload nginx

echo
echo "✅ Deploy complete."
echo "   Frontend: http://$(curl -s ifconfig.me 2>/dev/null || echo '<vps-ip>')"
echo "   Health:   http://$(curl -s ifconfig.me 2>/dev/null || echo '<vps-ip>')/api/health"
echo
