# MedStore Pro — VPS Deploy Guide

Single-VPS production deployment. **Mongo runs in Docker, everything else native.**

```
Internet ──443──▶ Nginx ──▶ Express (PM2 :5000) ──▶ MongoDB (Docker :27017)
                   └──▶ React build (static)
```

**Tested on:** Ubuntu 22.04 LTS, KVM2 8 GB RAM / 100 GB SSD / 2 vCPU.

---

## 1. First-time bootstrap

SSH into the VPS as `root` (or sudo user), then:

```bash
# Get the bootstrap script onto the box
curl -fsSL -o vps-setup.sh https://raw.githubusercontent.com/<your-user>/<your-repo>/main/deploy/vps-setup.sh
sudo bash vps-setup.sh
```

This installs **Node 20, Docker, Nginx, PM2, Certbot, UFW, fail2ban**, creates a 4 GB swap file, opens ports 22/80/443, and creates the `medstore` deploy user with `/var/www/medstore` ready to go.

> Time: ~5 min on a fresh VPS.

---

## 2. Clone the repo

Switch to the deploy user and pull the code:

```bash
sudo su - medstore
git clone https://github.com/<your-user>/medstore-pro.git /var/www/medstore
cd /var/www/medstore
```

---

## 3. Create env files

### MongoDB credentials (`deploy/.env`)

```bash
cp deploy/env.mongo.example deploy/.env
nano deploy/.env
```

Generate a strong password:

```bash
openssl rand -base64 24 | tr -d '/+='
```

Paste it in as `MONGO_PASS`.

### Backend env (`backend/.env`)

```bash
cp deploy/env.backend.example backend/.env
nano backend/.env
```

Fill in:
- `MONGODB_URI` → use the same `MONGO_USER` / `MONGO_PASS` from `deploy/.env`
  ```
  mongodb://medstore_admin:YOUR_PASS@127.0.0.1:27017/medstore?authSource=admin
  ```
- `JWT_SECRET` → `openssl rand -base64 48`
- `CORS_ORIGIN` → `http://YOUR_VPS_IP` (or `https://yourdomain.com` later)

---

## 4. Install Nginx site config

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/medstore
sudo ln -sf /etc/nginx/sites-available/medstore /etc/nginx/sites-enabled/medstore
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. First deploy

```bash
cd /var/www/medstore
bash deploy/deploy.sh
```

This script will:
1. Pull latest code
2. Start Mongo container (`docker compose up -d`)
3. `npm ci` for backend + frontend
4. Build the frontend (`npm run build` → `frontend/dist/`)
5. Start backend with PM2 (cluster mode, 2 workers)
6. Reload Nginx

---

## 6. Seed the database (one-time)

```bash
cd /var/www/medstore/backend
node seeds/index.js
```

This creates the SuperAdmin user. Default credentials (change immediately after first login):

```
Email:    superadmin@medstore.com
Password: admin123456
```

---

## 7. Verify

Open `http://YOUR_VPS_IP` in browser — login screen should appear.

Quick health check:
```bash
curl http://127.0.0.1/api/health
# → {"status":"ok","timestamp":"..."}
```

PM2 status:
```bash
pm2 status
pm2 logs medstore-api --lines 50
```

Mongo:
```bash
docker ps
docker logs medstore-mongo --tail 50
```

---

## 8. SSL (when domain is ready)

Point your domain's A record to the VPS IP. Then:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot edits the Nginx config in place and sets up auto-renewal. After this:

- Update `backend/.env` → `CORS_ORIGIN=https://yourdomain.com`, `COOKIE_SECURE=true`
- `pm2 reload medstore-api`

---

## 9. Nightly backups

```bash
sudo mkdir -p /var/log/medstore /var/backups/medstore
sudo chown medstore:medstore /var/log/medstore /var/backups/medstore
crontab -e
```

Add:
```
0 3 * * * /var/www/medstore/deploy/backup-mongo.sh >> /var/log/medstore/backup.log 2>&1
```

Backups land in `/var/backups/medstore/` — last 14 days kept, older auto-pruned.

To restore from a backup:
```bash
docker exec -i medstore-mongo mongorestore \
  --archive --gzip --drop \
  -u medstore_admin -p 'YOUR_PASS' --authenticationDatabase admin \
  < /var/backups/medstore/medstore-2026-05-01_030000.archive.gz
```

---

## Routine operations

| Task                           | Command                                                    |
|--------------------------------|------------------------------------------------------------|
| Deploy a new version           | `cd /var/www/medstore && bash deploy/deploy.sh`            |
| Tail API logs                  | `pm2 logs medstore-api`                                    |
| Restart backend                | `pm2 reload medstore-api` (zero-downtime)                  |
| Mongo shell                    | `docker exec -it medstore-mongo mongosh -u medstore_admin -p` |
| Mongo logs                     | `docker logs -f medstore-mongo`                            |
| Nginx reload                   | `sudo nginx -t && sudo systemctl reload nginx`             |
| Disk usage                     | `df -h && du -sh /var/www/medstore/* /var/backups/medstore` |
| Memory / CPU                   | `htop` or `pm2 monit`                                      |
| Manual Mongo backup            | `bash /var/www/medstore/deploy/backup-mongo.sh`            |

---

## Capacity for 15 users

On 8 GB / 2 vCPU you have **way more headroom than needed**. Rough RAM use:

| Component          | RAM    |
|--------------------|--------|
| MongoDB container  | ~1.5 GB |
| Node (PM2 × 2)     | ~500 MB |
| Nginx              | ~50 MB  |
| OS + journald      | ~800 MB |
| **Free**           | **~5 GB** |

You'll comfortably hit 50-100 active users on this box before needing to scale. When that day comes, the easiest upgrade is **bigger VPS + same setup** — no re-architecting needed.

---

## Troubleshooting

**Frontend shows 404 on refresh** → SPA fallback missing. Check `try_files $uri $uri/ /index.html;` is in `nginx.conf`.

**`502 Bad Gateway` on `/api`** → backend not running. `pm2 status` to check, `pm2 logs` to debug.

**Mongo connection refused** → container not up. `docker ps` should show `medstore-mongo`. If not: `docker compose --env-file deploy/.env -f deploy/docker-compose.mongo.yml up -d`.

**Avatars / uploaded files not showing** → check `/var/www/medstore/backend/uploads/` exists and `medstore` owns it: `chown -R medstore:medstore backend/uploads`.

**CORS errors** → `backend/.env` `CORS_ORIGIN` must exactly match the URL the browser is on (including `http://` vs `https://`, trailing slash matters? no — but scheme + host + port must match).
