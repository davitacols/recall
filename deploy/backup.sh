#!/bin/sh
# Nightly Knoledgr backup. Deliberately separate from ~/solakuti/backup.sh —
# separate schedule, separate retention, separate failure mode, so neither
# stack's backups can be broken by a change to the other.
#
# Media is not included: it still lives in Cloudinary/S3, which keep their own
# durability. Revisit this if media is ever moved onto local disk.
set -e

BACKUP_DIR=/home/deploy/backups/knoledgr
mkdir -p "$BACKUP_DIR"

cd /home/deploy/recall
DC="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"
STAMP=$(date +%F_%H%M)

# --clean --if-exists so the dump can be replayed into a non-empty database.
$DC exec -T db pg_dump -U knoledgr --clean --if-exists knoledgr \
  | gzip > "$BACKUP_DIR/knoledgr-$STAMP.sql.gz"

# Fail loudly rather than silently retaining a truncated dump.
if [ ! -s "$BACKUP_DIR/knoledgr-$STAMP.sql.gz" ]; then
  echo "backup FAILED: empty dump at $STAMP" >&2
  exit 1
fi

find "$BACKUP_DIR" -name 'knoledgr-*.sql.gz' -mtime +14 -delete
echo "backup done: $STAMP ($(du -h "$BACKUP_DIR/knoledgr-$STAMP.sql.gz" | cut -f1))"
