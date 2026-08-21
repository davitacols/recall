#!/bin/bash
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
# bash, not sh, for `pipefail` — and pipefail is the entire point.
#
# The dump is a pipeline: pg_dump | gzip > file. A POSIX shell reports only the
# *last* command's status, so when pg_dump failed, gzip still succeeded and the
# script carried on believing it had a backup. gzip of empty input is a valid
# ~20-byte file, so the "is it empty?" guard passed and so did gzip -t. A
# completely failed dump was written, kept, and logged as "backup done".
#
# This was found by deliberately breaking pg_dump and watching the script
# report success. It is the failure mode that matters most, because a backup
# that is present but empty is worse than one that is missing: the missing one
# is obvious.
set -euo pipefail

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
  # Remove a half-written dump on any abnormal exit, including one from set -e
  # at the pipeline itself — which is before PARTIAL exists, hence the :- guard
  # under set -u.
  rm -f "${PARTIAL:-}"
  notify_failure "exit status $status"
  exit "$status"
}
trap on_exit EXIT

cd /home/deploy/recall
DC="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"

ARCHIVE="$BACKUP_DIR/knoledgr-$STAMP.sql.gz"
PARTIAL="$ARCHIVE.partial"

# Write to a .partial and only rename once every check has passed, so a failed
# run can neither leave something that looks like a backup nor overwrite a good
# one. Both happened while testing: a failing dump wrote a 20-byte file over a
# healthy 932K backup taken in the same minute, because the filename is derived
# from the timestamp and the shell had already truncated the target before
# pg_dump was even asked to run.
rm -f "$PARTIAL"

# --clean --if-exists so the dump can be replayed into a non-empty database.
$DC exec -T db pg_dump -U knoledgr --clean --if-exists knoledgr | gzip > "$PARTIAL"

# Three checks, because each catches something the others do not, and all three
# were reachable in practice.
reject() {
  rm -f "$PARTIAL"
  notify_failure "$1"
  COMPLETED=1   # already reported; do not report twice on the way out
  exit 1
}

# 1. gzip integrity — catches a stream truncated midway.
gzip -t "$PARTIAL" 2>/dev/null || reject "dump failed gzip integrity check"

# 2. Content — an empty dump still gzips to a valid ~20-byte file, so size
#    alone proves nothing. pg_dump always writes this header when it ran.
#
#    Read into a variable rather than piping into grep. Under pipefail,
#    `gzip -dc | head -c 4096 | grep -q` reports failure even when grep matches:
#    head exits as soon as it has enough, gzip dies of SIGPIPE, and pipefail
#    surfaces that 141 as the pipeline's status. That would have rejected every
#    healthy backup — the check would have been worse than no check.
header=$(gzip -dc "$PARTIAL" 2>/dev/null | head -c 4096 || true)
case "$header" in
  *"PostgreSQL database dump"*) ;;
  *) reject "dump does not look like a pg_dump (pg_dump probably failed)" ;;
esac

# 3. Size floor — guards against a dump that starts correctly and then stops.
#    The database is ~900K compressed; anything under 100K means something
#    went wrong partway through.
size=$(stat -c%s "$PARTIAL")
if [ "$size" -lt 102400 ]; then
  reject "dump is implausibly small (${size} bytes)"
fi

# Every check passed: publish it under its real name.
mv "$PARTIAL" "$ARCHIVE"

find "$BACKUP_DIR" -name 'knoledgr-*.sql.gz' -mtime +14 -delete

# ---------------------------------------------------------------------------
# Off-site copy.
#
# Until this is configured, every backup lives on the same disk as the database
# it protects. A disk failure loses the product and its record together, and no
# other risk on this box is unrecoverable in that way.
#
# Deliberately unconfigured rather than guessed at: set BACKUP_OFFSITE_DEST in
# deploy/.env.prod to any rclone remote path (for example "b2:knoledgr-backups"
# or "s3:bucket/path") and this starts running. rclone is used because it
# covers every provider with one syntax and needs no vendor SDK on the box.
#
# A failure here does NOT reject the backup. The local copy has already passed
# every check and is good; losing the off-site copy is a smaller problem than
# discarding a verified dump. It is loud instead, because a silent off-site
# failure is how you discover months later that only the local copy existed.
# ---------------------------------------------------------------------------
if [ -n "${BACKUP_OFFSITE_DEST:-}" ]; then
  if ! command -v rclone >/dev/null 2>&1; then
    echo "WARNING: BACKUP_OFFSITE_DEST is set but rclone is not installed" >&2
    notify_failure "off-site copy skipped: rclone is not installed. The local backup is verified and kept."
  elif rclone copy "$ARCHIVE" "$BACKUP_OFFSITE_DEST" --no-traverse 2>&1; then
    echo "off-site copy done: $BACKUP_OFFSITE_DEST"
  else
    echo "WARNING: off-site copy failed" >&2
    notify_failure "off-site copy failed. The local backup is verified and kept, but it is the only copy."
  fi
else
  echo "note: no BACKUP_OFFSITE_DEST set — this backup exists only on this disk"
fi

date -u +%FT%TZ > "$STATUS_FILE"
COMPLETED=1
echo "backup done: $STAMP ($(du -h "$ARCHIVE" | cut -f1))"
