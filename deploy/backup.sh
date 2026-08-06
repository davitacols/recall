#!/bin/sh
# Nightly Knoledgr backup. Deliberately separate from ~/solakuti/backup.sh —
# separate schedule, separate retention, separate failure mode, so neither
# stack's backups can be broken by a change to the other.
#
# Media is not included: it still lives in Cloudinary/S3, which keep their own
# durability. Revisit this if media is ever moved onto local disk.
#
# On 2026-08-01 this script lost its executable bit and cron recorded
# "Permission denied". No backup was taken that day and nothing said so — the
# gap was found five days later by listing the directory. The script already
# said "fail loudly", but loud meant stderr, and stderr meant a log file nobody
# opens. A backup you are not told about is a backup you find out about when
# you need it.
#
# So failure now sends mail, and every success leaves a timestamp behind. The
# timestamp is what makes a *missing* run detectable: a script that never
# executes cannot report its own failure, but a stale marker is still there to
# be noticed.
set -e

BACKUP_DIR=/home/deploy/backups/knoledgr
ENV_FILE=/home/deploy/recall/deploy/.env.prod
STATUS_FILE="$BACKUP_DIR/.last-success"
STAMP=$(date +%F_%H%M)

mkdir -p "$BACKUP_DIR"

# Read a value from the compose env file. Cron gives us almost no environment,
# and the alert needs credentials that live there.
get_env() {
  [ -f "$ENV_FILE" ] || return 0
  sed -n "s/^$1=//p" "$ENV_FILE" | tr -d '\r' | head -1
}

notify_failure() {
  reason="$1"
  echo "backup FAILED at $STAMP: $reason" >&2

  api_key=$(get_env RESEND_API_KEY)
  to_addr=$(get_env BACKUP_ALERT_EMAIL)
  from_addr=$(get_env DEFAULT_FROM_EMAIL)
  [ -n "$from_addr" ] || from_addr="Knoledgr <noreply@knoledgr.com>"

  if [ -z "$api_key" ] || [ -z "$to_addr" ]; then
    echo "backup alert not sent: RESEND_API_KEY or BACKUP_ALERT_EMAIL missing" >&2
    return 0
  fi

  last_ok="never"
  [ -f "$STATUS_FILE" ] && last_ok=$(cat "$STATUS_FILE")

  # Best effort: an alert that cannot be delivered must not become a second
  # failure, and must not mask the first one.
  curl -s -o /dev/null -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer $api_key" \
    -H "Content-Type: application/json" \
    -d "{\"from\":\"$from_addr\",\"to\":[\"$to_addr\"],\"subject\":\"Knoledgr backup FAILED ($STAMP)\",\"text\":\"The nightly Knoledgr database backup did not complete.\\n\\nReason: $reason\\nLast successful backup: $last_ok\\n\\nHost: $(hostname)\\nDirectory: $BACKUP_DIR\\n\\nRun it by hand to see the error:\\n  /home/deploy/recall/deploy/backup.sh\"}" \
    || echo "backup alert could not be delivered" >&2
}

# Any exit before COMPLETED is set counts as a failure, including one from
# set -e partway through. Guarded by the flag so notify_failure's own exit
# cannot re-enter this handler.
COMPLETED=0
on_exit() {
  status=$?
  [ "$COMPLETED" -eq 1 ] && exit 0
  notify_failure "exit status $status"
  exit "$status"
}
trap on_exit EXIT

cd /home/deploy/recall
DC="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"

# --clean --if-exists so the dump can be replayed into a non-empty database.
$DC exec -T db pg_dump -U knoledgr --clean --if-exists knoledgr \
  | gzip > "$BACKUP_DIR/knoledgr-$STAMP.sql.gz"

# A truncated dump is worse than no dump: it looks like a backup.
if [ ! -s "$BACKUP_DIR/knoledgr-$STAMP.sql.gz" ]; then
  rm -f "$BACKUP_DIR/knoledgr-$STAMP.sql.gz"
  notify_failure "dump was empty"
  COMPLETED=1   # already reported; do not report twice on the way out
  exit 1
fi

# gzip -t catches a stream truncated midway, which a size check does not.
if ! gzip -t "$BACKUP_DIR/knoledgr-$STAMP.sql.gz" 2>/dev/null; then
  rm -f "$BACKUP_DIR/knoledgr-$STAMP.sql.gz"
  notify_failure "dump failed gzip integrity check"
  COMPLETED=1
  exit 1
fi

find "$BACKUP_DIR" -name 'knoledgr-*.sql.gz' -mtime +14 -delete

date -u +%FT%TZ > "$STATUS_FILE"
COMPLETED=1
echo "backup done: $STAMP ($(du -h "$BACKUP_DIR/knoledgr-$STAMP.sql.gz" | cut -f1))"
