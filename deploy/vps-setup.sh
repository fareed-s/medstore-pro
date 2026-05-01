#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  MedStore Pro — VPS one-time bootstrap (Ubuntu 22.04 LTS)
#
#  What this does:
#    1. Updates the system + creates a 4 GB swap file (helps Mongo + Node stay
#       healthy on an 8 GB box during build spikes).
#    2. Installs Docker (for Mongo only), Node.js 20 LTS, Nginx, PM2, Certbot,
#       UFW, fail2ban, and basic utilities.
#    3. Creates the deploy user `medstore` (no password, sudo enabled) and the
#       app directory `/var/www/medstore`.
#    4. Configures UFW firewall — only 22 / 80 / 443 are open. Mongo (27017)
#       is bound to 127.0.0.1 so it cannot be reached from the internet.
#
#  Run this ONCE as root after first SSH-ing into the VPS:
#      curl -fsSL https://raw.githubusercontent.com/<user>/<repo>/main/deploy/vps-setup.sh | bash
#  …or scp the file over and `sudo bash vps-setup.sh`.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash vps-setup.sh"
  exit 1
fi

echo "▶ Updating apt & installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -yqq
apt-get install -yqq curl wget git ca-certificates gnupg lsb-release \
  ufw fail2ban htop unzip jq build-essential

# ── Swap (4 GB) ──────────────────────────────────────────────────────────────
if [[ ! -f /swapfile ]]; then
  echo "▶ Creating 4 GB swap"
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl vm.swappiness=10 > /dev/null
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

# ── Node.js 20 LTS ───────────────────────────────────────────────────────────
if ! command -v node > /dev/null || [[ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 20 ]]; then
  echo "▶ Installing Node.js 20 LTS"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -yqq nodejs
fi

# ── PM2 (global) ─────────────────────────────────────────────────────────────
if ! command -v pm2 > /dev/null; then
  echo "▶ Installing PM2"
  npm install -g pm2@latest
fi

# ── Docker (for Mongo container) ─────────────────────────────────────────────
if ! command -v docker > /dev/null; then
  echo "▶ Installing Docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -yqq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
fi

# ── Nginx + Certbot ──────────────────────────────────────────────────────────
echo "▶ Installing Nginx & Certbot"
apt-get install -yqq nginx
apt-get install -yqq certbot python3-certbot-nginx

# ── Deploy user ──────────────────────────────────────────────────────────────
if ! id medstore > /dev/null 2>&1; then
  echo "▶ Creating 'medstore' deploy user"
  adduser --disabled-password --gecos "" medstore
  usermod -aG sudo,docker medstore
  # Allow ssh key login from root's authorized keys
  if [[ -f /root/.ssh/authorized_keys ]]; then
    mkdir -p /home/medstore/.ssh
    cp /root/.ssh/authorized_keys /home/medstore/.ssh/authorized_keys
    chown -R medstore:medstore /home/medstore/.ssh
    chmod 700 /home/medstore/.ssh
    chmod 600 /home/medstore/.ssh/authorized_keys
  fi
fi

# ── App directory ────────────────────────────────────────────────────────────
echo "▶ Creating /var/www/medstore"
mkdir -p /var/www/medstore
chown -R medstore:medstore /var/www/medstore

# ── Firewall ─────────────────────────────────────────────────────────────────
echo "▶ Configuring UFW firewall"
ufw --force reset > /dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'        # 80 + 443
ufw --force enable
systemctl enable --now fail2ban

# ── PM2 startup hook (so backend auto-starts on reboot) ──────────────────────
echo "▶ Wiring PM2 startup for user 'medstore'"
sudo -u medstore -H bash -c 'pm2 startup systemd -u medstore --hp /home/medstore' \
  | tail -1 \
  | grep -E '^sudo' \
  | bash || true

echo
echo "✅ VPS bootstrap complete."
echo
echo "Next steps:"
echo "  1. Switch to deploy user:    sudo su - medstore"
echo "  2. Clone the repo:           git clone <REPO_URL> /var/www/medstore"
echo "  3. Run deploy script:        cd /var/www/medstore && bash deploy/deploy.sh"
echo
