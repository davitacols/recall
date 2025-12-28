# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration

**Backend (.env)**
```bash
# CRITICAL: Change these for production
SECRET_KEY=<generate-strong-random-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database - Use PostgreSQL in production
DATABASE_URL=postgresql://user:password@host:5432/recall_db

# Redis - Use managed Redis
REDIS_URL=redis://your-redis-host:6379/0

# AWS Credentials (for Cognito if used)
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1

# Anthropic API
ANTHROPIC_API_KEY=<your-key>

# Storage paths
CHROMA_PERSIST_DIRECTORY=/var/lib/recall/chroma_db
MEDIA_ROOT=/var/lib/recall/media
STATIC_ROOT=/var/lib/recall/static
```

**Frontend (.env.production)**
```bash
REACT_APP_API_URL=https://api.yourdomain.com
```

### 2. Security Hardening

**Django Settings (settings.py)**
```python
# Add to production settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

### 3. Database Migration

**Switch to PostgreSQL**
```bash
# Install PostgreSQL driver
pip install psycopg2-binary

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@host:5432/recall_db

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 4. Static Files

```bash
# Collect static files
python manage.py collectstatic --noinput

# Configure nginx to serve static files
# /etc/nginx/sites-available/recall
location /static/ {
    alias /var/lib/recall/static/;
}

location /media/ {
    alias /var/lib/recall/media/;
}
```

---

## Deployment Options

### Option 1: Docker Deployment (Recommended)

**docker-compose.production.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: recall_db
      POSTGRES_USER: recall_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

  backend:
    build: ./backend
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
    volumes:
      - static_volume:/app/static
      - media_volume:/app/media
    environment:
      - DATABASE_URL=postgresql://recall_user:${DB_PASSWORD}@postgres:5432/recall_db
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=False
    depends_on:
      - postgres
      - redis
    restart: always

  celery:
    build: ./backend
    command: celery -A config worker -l info
    environment:
      - DATABASE_URL=postgresql://recall_user:${DB_PASSWORD}@postgres:5432/recall_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    restart: always

  celery-beat:
    build: ./backend
    command: celery -A config beat -l info
    environment:
      - DATABASE_URL=postgresql://recall_user:${DB_PASSWORD}@postgres:5432/recall_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    restart: always

  frontend:
    build: ./frontend
    environment:
      - REACT_APP_API_URL=https://api.yourdomain.com
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/static
      - media_volume:/media
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  postgres_data:
  static_volume:
  media_volume:
```

**Dockerfile (backend)**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

RUN python manage.py collectstatic --noinput

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

**Dockerfile (frontend)**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### Option 2: AWS Deployment

**Services Needed:**
- **EC2**: Application servers
- **RDS**: PostgreSQL database
- **ElastiCache**: Redis
- **S3**: Media file storage
- **CloudFront**: CDN for static files
- **ALB**: Load balancer
- **Route 53**: DNS

**Estimated Monthly Cost:**
- EC2 (t3.medium x2): ~$60
- RDS (db.t3.small): ~$30
- ElastiCache (cache.t3.micro): ~$15
- S3 + CloudFront: ~$10
- **Total: ~$115/month**

### Option 3: Heroku Deployment (Easiest)

```bash
# Install Heroku CLI
# Create app
heroku create recall-app

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set SECRET_KEY=<your-key>
heroku config:set DEBUG=False
heroku config:set ANTHROPIC_API_KEY=<your-key>

# Deploy
git push heroku main

# Run migrations
heroku run python manage.py migrate

# Create superuser
heroku run python manage.py createsuperuser
```

**Procfile**
```
web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
worker: celery -A config worker -l info
beat: celery -A config beat -l info
```

---

## Performance Optimization

### 1. Database Indexing

Already implemented in models:
- Conversation: organization, post_type, created_at
- Decision: organization, status
- Reactions: conversation, user

### 2. Caching

**Add Redis caching (settings.py)**
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Cache frequently accessed data
from django.core.cache import cache

# Example: Cache FAQ for 1 hour
faq_items = cache.get('faq_items')
if not faq_items:
    faq_items = generate_faq()
    cache.set('faq_items', faq_items, 3600)
```

### 3. CDN for Static Files

Use CloudFront or Cloudflare to serve:
- React build files
- Images
- CSS/JS bundles

### 4. Database Connection Pooling

**Install pgbouncer**
```bash
# Ubuntu/Debian
sudo apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
recall_db = host=localhost port=5432 dbname=recall_db

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

---

## Monitoring & Logging

### 1. Application Monitoring

**Sentry for Error Tracking**
```bash
pip install sentry-sdk

# settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
)
```

### 2. Performance Monitoring

**New Relic or DataDog**
```bash
pip install newrelic

# Run with New Relic
NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program gunicorn config.wsgi:application
```

### 3. Logging

**Configure structured logging (settings.py)**
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

---

## Backup Strategy

### 1. Database Backups

**Automated PostgreSQL backups**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump recall_db | gzip > /backups/recall_db_$DATE.sql.gz

# Keep last 30 days
find /backups -name "recall_db_*.sql.gz" -mtime +30 -delete
```

### 2. Media Files Backup

**Sync to S3**
```bash
# Install AWS CLI
pip install awscli

# Sync media files
aws s3 sync /var/lib/recall/media s3://recall-backups/media/
```

---

## Scaling Strategy

### Phase 1: Single Server (0-1K users)
- 1 EC2 instance (backend + celery)
- RDS PostgreSQL
- ElastiCache Redis
- Cost: ~$100/month

### Phase 2: Horizontal Scaling (1K-10K users)
- 2-3 EC2 instances behind ALB
- Separate Celery workers
- RDS with read replicas
- Cost: ~$300/month

### Phase 3: High Availability (10K+ users)
- Auto-scaling groups
- Multi-AZ RDS
- ElastiCache cluster
- CloudFront CDN
- Cost: ~$800/month

---

## Security Checklist

- [ ] Change SECRET_KEY
- [ ] Set DEBUG=False
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable database encryption
- [ ] Implement rate limiting
- [ ] Set up WAF (Web Application Firewall)
- [ ] Regular security updates
- [ ] Backup encryption

---

## Launch Checklist

- [ ] All environment variables set
- [ ] Database migrated
- [ ] Static files collected
- [ ] SSL certificate installed
- [ ] DNS configured
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Documentation updated

---

## Post-Launch

### Week 1
- Monitor error rates
- Check performance metrics
- Verify backups working
- User feedback collection

### Month 1
- Review scaling needs
- Optimize slow queries
- Update documentation
- Plan feature roadmap

### Ongoing
- Weekly backups verification
- Monthly security updates
- Quarterly performance review
- Continuous feature delivery
