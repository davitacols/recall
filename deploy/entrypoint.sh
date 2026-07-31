#!/bin/sh
# Runs as the `migrate` one-shot before any long-running service starts.
# Keeping this in exactly one container means gunicorn, daphne, the worker and
# beat can never race each other applying the same migration.
set -e

echo "==> migrate"
python manage.py migrate --noinput

echo "==> collectstatic"
python manage.py collectstatic --noinput

echo "==> ready"
