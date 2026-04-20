# MedStore Pro — Deployment Guide
## Frontend: Vercel (Free) → Backend: Hostinger KVM2 VPS

---

## STEP 1: MongoDB Atlas (Free Database)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create account → Create free cluster (M0 Free)
3. Database Access → Add user: `medstoreAdmin` with password
4. Network Access → Add IP: `0.0.0.0/0` (allow all — for VPS)
5. Connect → Get connection string:
   ```
   mongodb+srv://medstoreAdmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/medstore-pro
   ```

---

## STEP 2: Backend on Hostinger KVM2 VPS

### SSH into VPS:
```bash
ssh root@YOUR-VPS-IP
```

### Install everything:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2
```

### Upload backend:
From your LOCAL machine:
```bash
scp -r backend/ root@YOUR-VPS-IP:/var/www/medstore-pro/
```

### Configure & start:
```bash
cd /var/www/medstore-pro/backend
npm install --production

# Create .env
cp .env.production .env
nano .env
# → Set MONGODB_URI to your Atlas connection string
# → Set JWT_SECRET to a random long string
# → Set CORS_ORIGIN to your Vercel URL (after step 3)

# Seed database
node seeds/index.js
node seeds/debug-login.js

# Start with PM2
cd ..
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/medstore-api
```
Paste this:
```nginx
server {
    listen 80;
    server_name YOUR-VPS-IP;

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
        client_max_body_size 10M;
    }
}
```
```bash
sudo ln -sf /etc/nginx/sites-available/medstore-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Test:
```bash
curl http://YOUR-VPS-IP/api/health
# Should return: {"status":"ok"}
```

---

## STEP 3: Frontend on Vercel (Free)

### Prepare:
1. Create a Git repo for the frontend folder
2. Push `frontend/` to GitHub

### Or use Vercel CLI:
```bash
cd frontend
npm install -g vercel
vercel login
vercel
```

### Vercel Dashboard Settings:
1. **Framework**: Vite
2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`
4. **Environment Variables** (Settings → Environment Variables):
   ```
   VITE_API_URL = http://YOUR-VPS-IP/api
   ```
   (Later when you have SSL: `https://YOUR-VPS-IP/api`)

### After deploy:
1. Copy your Vercel URL: `https://medstore-xyz.vercel.app`
2. Go back to VPS and update backend `.env`:
   ```bash
   nano /var/www/medstore-pro/backend/.env
   # Set: CORS_ORIGIN=https://medstore-xyz.vercel.app
   # Set: FRONTEND_URL=https://medstore-xyz.vercel.app
   pm2 restart medstore-api
   ```

---

## STEP 4: SSL (Optional but Recommended)

### If you get a domain later:
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renew
sudo certbot renew --dry-run
```

### Without domain (IP only):
Use `http://` for now. Vercel frontend is already HTTPS.
The API calls will be `http://YOUR-VPS-IP/api` — browsers may block mixed content.

**Workaround**: Use Cloudflare free plan:
1. Get free domain from freenom.com or use Cloudflare tunnel
2. Point DNS to your VPS IP
3. Cloudflare gives free SSL

---

## Quick Reference

| Component | URL |
|-----------|-----|
| Frontend | `https://medstore-xyz.vercel.app` |
| Backend API | `http://YOUR-VPS-IP/api` |
| MongoDB | MongoDB Atlas (cloud) |
| Health check | `http://YOUR-VPS-IP/api/health` |

## Login Credentials
- SuperAdmin: `superadmin@medstore.com` / `admin123456`
- StoreAdmin: `admin@alshifa.com` / `admin123456`

## Useful Commands (on VPS)
```bash
pm2 status           # Check if running
pm2 logs             # View logs
pm2 restart all      # Restart
pm2 stop all         # Stop
pm2 delete all       # Remove
```
