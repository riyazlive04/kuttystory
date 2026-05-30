#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Deployment Script for Kutty Story
# Run as the deploy user on the production server
# Usage: bash deploy.sh
# ──────────────────────────────────────────────────────────────

set -euo pipefail

APP_DIR="/var/www/kutty-story"
PM2_CONFIG="$APP_DIR/infrastructure/pm2/ecosystem.config.js"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "============================================"
echo "  Kutty Story - Deployment"
echo "  Started at: $(date)"
echo "============================================"

cd "$APP_DIR"

# ─── Pull Latest Code ────────────────────────────────────────

echo "[1/6] Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "Deployed commit: $(git rev-parse --short HEAD)"
echo "Commit message: $(git log -1 --pretty=%B)"

# ─── Install Dependencies ────────────────────────────────────

echo "[2/6] Installing dependencies..."
pnpm install --frozen-lockfile --prefer-offline

# ─── Build All Packages ──────────────────────────────────────

echo "[3/6] Building all packages..."
pnpm build

# ─── Run Database Migrations ─────────────────────────────────

echo "[4/6] Running database migrations..."
cd "$APP_DIR/packages/database"
npx prisma migrate deploy
cd "$APP_DIR"

# ─── Reload PM2 Processes ────────────────────────────────────

echo "[5/6] Reloading PM2 processes..."
if pm2 describe kutty-story-api > /dev/null 2>&1; then
    # Graceful reload (zero-downtime for cluster mode)
    pm2 reload "$PM2_CONFIG" --update-env
else
    # First deployment - start all processes
    pm2 start "$PM2_CONFIG"
fi

# Save PM2 process list so it survives reboot
pm2 save

# ─── Health Check ─────────────────────────────────────────────

echo "[6/6] Running health checks..."

HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_DELAY=3

check_health() {
    local url=$1
    local name=$2
    local attempt=1

    while [ $attempt -le $HEALTH_CHECK_RETRIES ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo "  [OK] $name is healthy"
            return 0
        fi
        echo "  [WAIT] $name not ready (attempt $attempt/$HEALTH_CHECK_RETRIES)..."
        sleep $HEALTH_CHECK_DELAY
        attempt=$((attempt + 1))
    done

    echo "  [FAIL] $name health check failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

HEALTH_OK=true
check_health "http://localhost:4000/health" "API" || HEALTH_OK=false
check_health "http://localhost:3000" "Web" || HEALTH_OK=false
check_health "http://localhost:3001" "Admin" || HEALTH_OK=false

echo ""
if [ "$HEALTH_OK" = true ]; then
    echo "============================================"
    echo "  Deployment Successful!"
    echo "  Completed at: $(date)"
    echo "  Commit: $(git rev-parse --short HEAD)"
    echo "============================================"
else
    echo "============================================"
    echo "  WARNING: Some health checks failed!"
    echo "  Check logs: pm2 logs"
    echo "============================================"
    exit 1
fi
