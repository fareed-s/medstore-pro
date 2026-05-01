#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  MedStore Pro — Mongo backup script
#
#  Run nightly via cron:
#      crontab -e
#      0 3 * * * /var/www/medstore/deploy/backup-mongo.sh >> /var/log/medstore/backup.log 2>&1
#
#  Keeps last 14 daily snapshots in /var/backups/medstore.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="/var/backups/medstore"
RETENTION_DAYS=14
ENV_FILE="/var/www/medstore/deploy/.env"

mkdir -p "$BACKUP_DIR"

# Load Mongo creds
set -a; source "$ENV_FILE"; set +a

STAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT="$BACKUP_DIR/medstore-$STAMP.archive.gz"

echo "[$(date)] Backing up to $OUT"
docker exec medstore-mongo mongodump \
  --archive --gzip \
  --username "$MONGO_USER" \
  --password "$MONGO_PASS" \
  --authenticationDatabase admin \
  > "$OUT"

# Prune old backups
find "$BACKUP_DIR" -name 'medstore-*.archive.gz' -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup done. Current snapshots:"
ls -lh "$BACKUP_DIR" | tail -5
