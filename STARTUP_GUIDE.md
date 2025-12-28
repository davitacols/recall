# Recall - Complete Startup Guide

## Prerequisites Check
- ✅ Python 3.9+ installed
- ✅ Node.js 16+ installed
- ✅ Docker Desktop installed
- ✅ PostgreSQL (optional, using SQLite by default)

## Quick Start (4 Steps)

### Step 1: Start Redis
```bash
# Start Docker Desktop first, then:
start-redis.bat
```
This starts Redis in Docker on port 6379.

### Step 2: Start Backend
```bash
start-backend.bat
```
Django server runs on http://localhost:8000

### Step 3: Start Celery Worker
```bash
start-celery.bat
```
Celery processes AI tasks (summaries, action items, keywords).

### Step 4: Start Frontend
```bash
start-frontend.bat
```
React app runs on http://localhost:3000

## Verify Everything Works

### 1. Check Redis
```bash
docker ps
```
Should show `recall-redis` container running.

### 2. Check Backend
Open http://localhost:8000/admin
Should see Django admin login.

### 3. Check Celery
Look for "celery@HOSTNAME ready" in the Celery terminal.

### 4. Check Frontend
Open http://localhost:3000
Should see Recall login page.

## Test AI Processing

1. Login to the app
2. Create a new conversation with substantial content
3. Wait 5-10 seconds
4. Refresh the page
5. You should see:
   - AI Summary at the top
   - Action Items extracted
   - Keywords/tags generated

## Troubleshooting

### Redis won't start
```bash
# Check if Docker Desktop is running
docker --version

# If Docker isn't running, start Docker Desktop first
# Then run: start-redis.bat
```

### Celery errors
```bash
# Make sure Redis is running first
docker ps

# Check Redis connection
docker exec -it recall-redis redis-cli ping
# Should return: PONG
```

### AI processing not working
1. Check AWS credentials in `backend\.env`
2. Verify Celery worker is running
3. Check Celery logs for errors
4. Ensure Redis is accessible

### Port already in use
```bash
# Backend (8000)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Frontend (3000)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Redis (6379)
docker-compose down
docker-compose up -d
```

## Stop Everything

```bash
# Stop Redis
docker-compose down

# Stop Backend/Celery/Frontend
# Press Ctrl+C in each terminal
```

## Production Deployment

For production, use:
- Managed Redis (AWS ElastiCache, Redis Cloud)
- PostgreSQL database
- Gunicorn/uWSGI for Django
- Nginx for static files
- Supervisor/systemd for Celery workers

See `AWS_RDS_SETUP.md` for AWS deployment guide.
