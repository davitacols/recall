# Redis Setup for Windows

## Option 1: Use WSL (Recommended)
```bash
# Install WSL if not already installed
wsl --install

# In WSL terminal:
sudo apt update
sudo apt install redis-server
redis-server
```

## Option 2: Download Redis for Windows
1. Download from: https://github.com/microsoftarchive/redis/releases
2. Download `Redis-x64-3.0.504.msi`
3. Install and run as Windows service

## Option 3: Use Docker (Easiest)
```bash
docker run -d -p 6379:6379 redis:alpine
```

## Option 4: Disable AI Processing (Current)
Already done! Conversations work without Redis.
AI processing is optional and fails gracefully.

## Check if Redis is Running
```bash
redis-cli ping
# Should return: PONG
```

## For Development: Skip Redis
The app now works without Redis. AI features (summarization, action items) won't work, but everything else does:
- ✅ Create conversations
- ✅ Reply to conversations  
- ✅ Create decisions
- ✅ Search knowledge
- ✅ Activity feed
- ✅ Mentions & tags
- ❌ AI summaries (requires Redis + Celery)
