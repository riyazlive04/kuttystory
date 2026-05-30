#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Database Backup Script for Kutty Story
# Dumps PostgreSQL database and uploads to Cloudflare R2
# Usage: bash backup.sh (or run via cron)
#
# Cron example (daily at 2 AM IST):
#   0 2 * * * /var/www/kutty-story/infrastructure/scripts/backup.sh >> /var/log/kutty-story/backup.log 2>&1
# ──────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────

DB_NAME="${DB_NAME:-kuttystory}"
DB_USER="${DB_USER:-kuttystory}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

R2_BUCKET="${R2_BUCKET:-kutty-story-backups}"
R2_ENDPOINT="${R2_ENDPOINT:-https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com}"

BACKUP_DIR="/tmp/kutty-story-backups"
RETENTION_DAYS=30

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="kuttystory_${TIMESTAMP}.sql.gz"

echo "============================================"
echo "  Kutty Story - Database Backup"
echo "  Started at: $(date)"
echo "============================================"

# ─── Create Backup Directory ─────────────────────────────────

mkdir -p "$BACKUP_DIR"

# ─── Dump Database ────────────────────────────────────────────

echo "[1/4] Dumping database '$DB_NAME'..."
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=6 \
    --no-owner \
    --no-privileges \
    --verbose \
    2>/dev/null | gzip > "$BACKUP_DIR/$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "  Backup size: $BACKUP_SIZE"

# ─── Upload to R2 ────────────────────────────────────────────

echo "[2/4] Uploading to Cloudflare R2..."
aws s3 cp \
    "$BACKUP_DIR/$BACKUP_FILE" \
    "s3://$R2_BUCKET/database/$BACKUP_FILE" \
    --endpoint-url "$R2_ENDPOINT" \
    --only-show-errors

echo "  Uploaded: s3://$R2_BUCKET/database/$BACKUP_FILE"

# ─── Delete Local Dump ────────────────────────────────────────

echo "[3/4] Cleaning up local backup file..."
rm -f "$BACKUP_DIR/$BACKUP_FILE"

# ─── Clean Up Old Remote Backups ──────────────────────────────

echo "[4/4] Removing backups older than $RETENTION_DAYS days from R2..."

CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)

aws s3 ls "s3://$R2_BUCKET/database/" \
    --endpoint-url "$R2_ENDPOINT" 2>/dev/null | \
while read -r line; do
    FILE_NAME=$(echo "$line" | awk '{print $4}')
    # Extract date from filename (kuttystory_YYYYMMDD_HHMMSS.sql.gz)
    FILE_DATE=$(echo "$FILE_NAME" | grep -oP '\d{8}' | head -1)

    if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
        echo "  Deleting old backup: $FILE_NAME"
        aws s3 rm "s3://$R2_BUCKET/database/$FILE_NAME" \
            --endpoint-url "$R2_ENDPOINT" \
            --only-show-errors
    fi
done

# ─── Summary ─────────────────────────────────────────────────

echo ""
echo "============================================"
echo "  Backup Complete!"
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"
echo "  Location: s3://$R2_BUCKET/database/$BACKUP_FILE"
echo "  Completed at: $(date)"
echo "============================================"
