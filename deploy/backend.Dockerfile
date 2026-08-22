# Knoledgr backend image. One image, four roles — gunicorn (HTTP), daphne
# (websockets), celery worker, celery beat — selected by the compose command.
# Build context is the repo root so deploy/entrypoint.sh can be copied in.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app

# libpq5 is the psycopg2-binary runtime; curl backs the compose healthchecks.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl libpq5 \
 && rm -rf /var/lib/apt/lists/*

# Requirements first so dependency layers survive application-code changes.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Neither migrate nor collectstatic runs at build time: both need the real
# environment and both write to volumes shared with nginx. They run once, in
# the `migrate` one-shot service.

EXPOSE 8000 8001
