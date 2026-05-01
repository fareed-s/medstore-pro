# MedStore Pro — Docker Deploy Guide

Use this when the VPS already has other Docker apps and a reverse-proxy
container fronting :80/:443. (See `DEPLOY.md` for the alternative
native-Nginx + PM2 setup on a fresh VPS.)

## Architecture

```
http://VPS_IP:8085
        ↓
┌─────────────────┐
│ medstore-web    │  nginx + React build
│ port 8085 → 80  │  proxies /api → api:5000
└────────┬────────┘
         │
         ↓
┌─────────────────┐    ┌──────────────────┐
│ medstore-api    │ ←→ │ medstore-mongo   │
│ Node 20 + Tini  │    │ MongoDB 7        │
│ (internal)      │    │ (localhost:27020)│
└─────────────────┘    └──────────────────┘
       Network: medstore-net (bridge)
```

When you eventually point a domain at the VPS, attach the outer reverse-proxy
container to `medstore-net` and add a server block proxying to `web:80`.

---

## 1. First-time deploy

### Clone the repo

```bash
sudo mkdir -p /opt/apps && sudo chown $USER /opt/apps
cd /opt/apps
git clone https://github.com/fareed-s/medstore-pro.git medstore
cd medstore
```

### Create `.env`

```bash
cp .env.docker.example .env
nano .env
```

Fill these in:
- `MONGO_PASS` — `openssl rand -base64 24 | tr -d '/+='`
- `JWT_SECRET` — `openssl rand -base64 48`
- `CORS_ORIGIN` — `http://YOUR_VPS_IP:8085`
- (optional) `WEB_PORT=8085` — change if 8085 is taken

### Build + start

```bash
docker compose up -d --build
docker compose ps        # all three should be 'Up'  (mongo healthy after ~30s)
docker compose logs -f api
```

Browser: `http://YOUR_VPS_IP:8085` → login screen.

### Seed the SuperAdmin (fresh DB only)

```bash
docker compose exec api node seeds/index.js
```

Login with the credentials from `.env` (defaults: `superadmin@medstore.com` / `admin123456`).

---

## 2. Migrating from an old MedStore deployment

If you have an old `medstore-mongodb` container with real data:

### Step 1 — Backup the old DB

```bash
mkdir -p ~/medstore-backup
docker exec medstore-mongodb mongodump \
  --archive --gzip \
  --username medstore_admin \
  --password 'OLD_PASSWORD' \
  --authenticationDatabase admin \
  --db medstore-pro \
  > ~/medstore-backup/medstore-pro-$(date +%F_%H%M).archive.gz
ls -lh ~/medstore-backup/
```

### Step 2 — Bring up the new stack (alongside the old)

The new `medstore-mongo` runs on host port 27020 and the new `medstore-web`
on 8085, so it doesn't conflict with the old `medstore-mongodb` (27018) and
`medstore-pro-backend` (5001).

```bash
cd /opt/apps/medstore
docker compose up -d --build
```

### Step 3 — Restore the dump into the new mongo

```bash
# Use the SAME password as in your new .env
NEW_PASS="$(grep ^MONGO_PASS .env | cut -d= -f2)"

docker exec -i medstore-mongo mongorestore \
  --archive --gzip --drop \
  --username medstore_admin \
  --password "$NEW_PASS" \
  --authenticationDatabase admin \
  --nsFrom 'medstore-pro.*' --nsTo 'medstore-pro.*' \
  < ~/medstore-backup/medstore-pro-*.archive.gz
```

### Step 4 — Verify

```bash
docker compose exec mongo mongosh \
  -u medstore_admin -p "$NEW_PASS" --authenticationDatabase admin \
  --quiet --eval "
    var d = db.getSiblingDB('medstore-pro');
    print('medicines: ' + d.medicines.countDocuments());
    print('users:     ' + d.users.countDocuments());
    print('stores:    ' + d.stores.countDocuments());
  "
```

Counts should match the old DB. Login on `http://VPS_IP:8085` with the same
credentials you used before.

### Step 5 — Migrate avatar uploads (if any)

```bash
docker cp medstore-pro-backend:/app/uploads/. /opt/apps/medstore/backend/uploads/
docker compose restart api
```

### Step 6 — Decommission old containers

Once you've verified the new deployment works:

```bash
docker stop medstore-pro-backend medstore-mongodb
docker rm   medstore-pro-backend medstore-mongodb
docker network rm medstore-network 2>/dev/null
# Old volumes — keep for a week as safety, then:
#   docker volume ls | grep medstore     # find old volume names
#   docker volume rm <old-volume-name>
```

---

## 3. Routine commands

| Task                         | Command                                              |
|------------------------------|------------------------------------------------------|
| Pull new code + redeploy     | `git pull && docker compose up -d --build`          |
| Restart backend only         | `docker compose restart api`                         |
| Tail backend logs            | `docker compose logs -f api`                         |
| Container status             | `docker compose ps`                                  |
| Mongo shell                  | `docker compose exec mongo mongosh -u medstore_admin -p` |
| One-off backup               | See `deploy/backup-mongo.sh` (adjust container name to `medstore-mongo`) |
| Stop everything (keep data)  | `docker compose down`                                |
| Nuke everything (incl DB)    | `docker compose down -v`                             |

---

## 4. Adding a domain later

When you point e.g. `medstore.example.com` at the VPS:

1. Attach your outer reverse proxy to the `medstore-net` network:
   ```bash
   docker network connect medstore-net ep-nginx
   ```
2. Add a server block to that nginx (proxying to `http://medstore-web:80`).
3. Issue an SSL cert with certbot.
4. Update `.env` → `CORS_ORIGIN=https://medstore.example.com`, `COOKIE_SECURE=true`
5. `docker compose restart api`
