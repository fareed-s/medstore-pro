#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# MedStore Pro — VPS Backend Deployment Script
# Run this on your Hostinger KVM2 VPS via SSH
# ═══════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════"
echo "  MedStore Pro — VPS Setup"
echo "═══════════════════════════════════════"

# 1. Update system
echo "[1/8] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v

# 3. Install PM2 (process manager)
echo "[3/8] Installing PM2..."
sudo npm install -g pm2

# 4. Install Nginx
echo "[4/8] Installing Nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx

# 5. Create app directory
echo "[5/8] Setting up app directory..."
sudo mkdir -p /var/www/medstore-pro
sudo chown -R $USER:$USER /var/www/medstore-pro

# 6. Upload your backend files to /var/www/medstore-pro/backend/
echo "[6/8] Upload backend files..."
echo "  → Upload your backend folder to: /var/www/medstore-pro/backend/"
echo "  → Use FileZilla SFTP or scp command:"
echo "  → scp -r backend/ user@your-vps-ip:/var/www/medstore-pro/"
echo ""
echo "After uploading, run the following:"
echo ""
echo "  cd /var/www/medstore-pro/backend"
echo "  npm install --production"
echo "  cp .env.production .env"
echo "  # Edit .env with your real MongoDB URI and JWT secret"
echo "  nano .env"
echo ""
echo "  # Seed database"
echo "  node seeds/index.js"
echo "  node seeds/debug-login.js"
echo ""

# 7. PM2 ecosystem config
echo "[7/8] Creating PM2 config..."
cat > /var/www/medstore-pro/ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [{
    name: 'medstore-api',
    script: './backend/server.js',
    cwd: '/var/www/medstore-pro',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M',
    error_file: '/var/www/medstore-pro/logs/error.log',
    out_file: '/var/www/medstore-pro/logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
PMEOF

mkdir -p /var/www/medstore-pro/logs

echo ""
echo "  # Start backend with PM2:"
echo "  cd /var/www/medstore-pro"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup  # Follow the command it gives you"
echo ""

# 8. Nginx config
echo "[8/8] Creating Nginx config..."
sudo cat > /etc/nginx/sites-available/medstore-api << 'NGEOF'
server {
    listen 80;
    server_name _;  # Replace _ with your domain if you have one

    # API requests
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        client_max_body_size 10M;
    }

    # Uploads directory
    location /uploads/ {
        alias /var/www/medstore-pro/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGEOF

sudo ln -sf /etc/nginx/sites-available/medstore-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "═══════════════════════════════════════"
echo "  Backend Deployment Commands Summary"
echo "═══════════════════════════════════════"
echo ""
echo "1. Upload backend:  scp -r backend/ user@VPS-IP:/var/www/medstore-pro/"
echo "2. SSH into VPS:    ssh user@VPS-IP"
echo "3. Install deps:    cd /var/www/medstore-pro/backend && npm install --production"
echo "4. Configure .env:  cp .env.production .env && nano .env"
echo "5. Seed database:   node seeds/index.js"
echo "6. Start PM2:       cd .. && pm2 start ecosystem.config.js"
echo "7. Test API:        curl http://localhost:5000/api/health"
echo ""
echo "Your API will be available at: http://YOUR-VPS-IP/api/"
echo ""
