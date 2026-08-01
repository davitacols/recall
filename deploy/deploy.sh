#!/bin/sh
# Deploy Knoledgr from git. Run on the VPS:
#
#   ~/recall/deploy/deploy.sh                 # deploy the tracked branch
#   ~/recall/deploy/deploy.sh <branch|sha>    # deploy something specific
#
# Exists because deploying by copying files into ~/recall left the working tree
# matching no commit. Two things went wrong as a result: a rebuild silently
# resurrected a deleted test file, and nobody could tell from git what was
# actually running. Everything below comes from a commit, so the running image
# always traces back to a SHA.
#
# deploy/.env.prod is untracked and never touched here. `git clean` is
# deliberately NOT run — it would delete that file and the GitHub App key in it.
set -e

cd "$(dirname "$0")/.."
REF="${1:-$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo origin/main)}"
DC="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"

if [ ! -s deploy/.env.prod ]; then
  echo "ABORT: deploy/.env.prod is missing or empty"
  exit 1
fi

echo "==> backing up the environment file"
cp deploy/.env.prod "$HOME/env.prod.bak-$(date +%F_%H%M)"

echo "==> fetching"
git fetch origin --quiet

echo "==> checking for uncommitted work"
if [ -n "$(git status --porcelain)" ]; then
  echo "    working tree is dirty; these changes will be DISCARDED:"
  git status --porcelain | sed 's/^/      /'
  printf "    continue? [y/N] "
  read -r reply
  case "$reply" in
    [yY]) ;;
    *) echo "    aborted"; exit 1 ;;
  esac
fi

echo "==> moving to $REF"
git reset --hard "$REF" --quiet
echo "    now at $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"

echo "==> building"
$DC build

echo "==> starting"
$DC up -d

echo "==> waiting for the backend"
sleep 15

echo "==> migrations"
$DC logs --tail 20 migrate 2>&1 | grep -E "migrations to apply|Applying|static files|ready" || true

echo "==> health"
$DC ps --format "table {{.Service}}\t{{.Status}}"
docker exec recall-web-1 wget -qO- --header="Host: www.knoledgr.com" \
  http://localhost/api/health/ 2>/dev/null || echo "    health check unreachable"
echo ""
echo "==> deployed $(git rev-parse --short HEAD)"
