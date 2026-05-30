#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# VPS Provisioning Script for Kutty Story
# Run as root on a fresh Ubuntu 22.04/24.04 LTS server
# Usage: sudo bash provision.sh
# ──────────────────────────────────────────────────────────────

set -euo pipefail

echo "============================================"
echo "  Kutty Story - VPS Provisioning"
echo "============================================"

# ─── System Update ───────────────────────────────────────────

echo "[1/10] Updating system packages..."
apt update && apt upgrade -y

# ─── Install Essential Packages ──────────────────────────────

echo "[2/10] Installing essential packages..."
apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    jq \
    htop

# ─── Install Node.js 20 via NodeSource ──────────────────────

echo "[3/10] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
node --version

# Install pnpm
echo "Installing pnpm..."
npm install -g pnpm@latest
pnpm --version

# ─── Install PostgreSQL 16 ──────────────────────────────────

echo "[4/10] Installing PostgreSQL 16..."
if ! command -v psql &> /dev/null; then
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
    apt update
    apt install -y postgresql-16 postgresql-client-16
fi
systemctl enable postgresql
systemctl start postgresql

# ─── Install Redis ───────────────────────────────────────────

echo "[5/10] Installing Redis..."
if ! command -v redis-server &> /dev/null; then
    apt install -y redis-server
fi

# Configure Redis to bind to localhost only
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

systemctl enable redis-server
systemctl restart redis-server

# ─── Install Nginx ───────────────────────────────────────────

echo "[6/10] Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
fi
systemctl enable nginx

# ─── Install Certbot ─────────────────────────────────────────

echo "[7/10] Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# ─── Install and Configure UFW ───────────────────────────────

echo "[8/10] Configuring UFW firewall..."
apt install -y ufw

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS

echo "y" | ufw enable
ufw status verbose

# ─── Install Fail2Ban ────────────────────────────────────────

echo "[9/10] Installing Fail2Ban..."
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = ssh
filter  = sshd
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 10
FAIL2BAN

systemctl enable fail2ban
systemctl restart fail2ban

# ─── Create Deploy User and App Directory ────────────────────

echo "[10/10] Setting up deploy user and app directory..."

# Create deploy user if not exists
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG sudo deploy
    echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
    chmod 440 /etc/sudoers.d/deploy

    # Copy SSH keys from root
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
fi

# Install PM2 globally
npm install -g pm2@latest
pm2 --version

# Setup PM2 to start on boot (as deploy user)
env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

# Create app directory
mkdir -p /var/www/kutty-story
chown -R deploy:deploy /var/www/kutty-story

# Create log directory
mkdir -p /var/log/kutty-story
chown -R deploy:deploy /var/log/kutty-story

# Create SSL directory for temporary certs
mkdir -p /etc/nginx/ssl

# Create Certbot webroot
mkdir -p /var/www/certbot

# ─── PostgreSQL: Create Database and User ────────────────────

echo "Setting up PostgreSQL database..."
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='kuttystory'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER kuttystory WITH PASSWORD 'CHANGE_ME_IN_PRODUCTION';"

sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='kuttystory'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE kuttystory OWNER kuttystory;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kuttystory TO kuttystory;"

# ─── Nginx: Enable Site Config ───────────────────────────────

echo "Configuring Nginx..."
# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Symlink kutty story config (copy the config file first)
# cp /var/www/kutty-story/infrastructure/nginx/kuttystory.conf /etc/nginx/sites-available/kuttystory
# ln -sf /etc/nginx/sites-available/kuttystory /etc/nginx/sites-enabled/kuttystory

# Generate temporary self-signed cert for initial setup
if [ ! -f /etc/nginx/ssl/kuttystory.crt ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/kuttystory.key \
        -out /etc/nginx/ssl/kuttystory.crt \
        -subj "/CN=kuttystory.com/O=Kutty Story/C=IN"
fi

# Test and reload nginx
nginx -t && systemctl reload nginx

# ─── Summary ─────────────────────────────────────────────────

echo ""
echo "============================================"
echo "  Provisioning Complete!"
echo "============================================"
echo ""
echo "Installed:"
echo "  - Node.js $(node --version)"
echo "  - pnpm $(pnpm --version)"
echo "  - PostgreSQL 16"
echo "  - Redis $(redis-server --version | head -c 30)"
echo "  - Nginx $(nginx -v 2>&1)"
echo "  - PM2 $(pm2 --version)"
echo "  - Certbot"
echo "  - UFW (ports 22, 80, 443)"
echo "  - Fail2Ban"
echo ""
echo "Next steps:"
echo "  1. Update PostgreSQL password in .env"
echo "  2. Copy nginx config: cp /var/www/kutty-story/infrastructure/nginx/kuttystory.conf /etc/nginx/sites-available/kuttystory"
echo "  3. Enable site: ln -sf /etc/nginx/sites-available/kuttystory /etc/nginx/sites-enabled/"
echo "  4. Setup SSL: certbot --nginx -d kuttystory.com -d www.kuttystory.com -d admin.kuttystory.com -d api.kuttystory.com"
echo "  5. Deploy the application with deploy.sh"
echo ""
