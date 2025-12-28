# Redis & AI Processing - Complete Setup

## Overview

Recall uses Redis + Celery for asynchronous AI processing:
- **Redis**: Message broker for task queue
- **Celery**: Distributed task queue worker
- **Amazon Bedrock**: AI processing (Claude-3 Haiku)

## Architecture

```
User creates conversation
    ↓
Django saves to database
    ↓
Task sent to Redis queue
    ↓
Celery worker picks up task
    ↓
Calls Amazon Bedrock API
    ↓
Updates conversation with AI results
```

## Setup Steps

### 1. Install Redis (Docker - Recommended)

**Prerequisites:**
- Docker Desktop installed and running

**Start Redis:**
```bash
# From project root
start-redis.bat

# Or manually:
docker-compose up -d
```

**Verify Redis:**
```bash
docker ps
# Should show: recall-redis

docker exec -it recall-redis redis-cli ping
# Should return: PONG
```

### 2. Configure Environment

Edit `backend\.env`:
```env
# Redis
REDIS_URL=redis://localhost:6379/0

# AWS Bedrock
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=us-east-1
```

### 3. Test System Components

```bash
cd backend
venv\Scripts\activate
python test_system.py
```

Should show all components as ✅

### 4. Test AI Processing

```bash
python test_ai.py
```

Should generate summary, action items, and keywords.

### 5. Start Services

**Terminal 1 - Backend:**
```bash
start-backend.bat
```

**Terminal 2 - Celery:**
```bash
start-celery.bat
```

**Terminal 3 - Frontend:**
```bash
start-frontend.bat
```

## How It Works

### 1. Conversation Created

When a user creates a conversation in the UI:

```python
# apps/conversations/views.py
conversation = Conversation.objects.create(...)

# Trigger async AI processing
try:
    from .tasks import process_conversation_ai
    process_conversation_ai.delay(conversation.id)
except:
    pass  # Fails gracefully if Redis unavailable
```

### 2. Celery Task Executes

```python
# apps/conversations/tasks.py
@shared_task
def process_conversation_ai(conversation_id):
    conversation = Conversation.objects.get(id=conversation_id)
    processor = AIProcessor()
    
    # Call Amazon Bedrock
    summary = processor.generate_summary(conversation.content)
    action_items = processor.extract_action_items(conversation.content)
    keywords = processor.extract_keywords(conversation.content)
    
    # Update conversation
    conversation.ai_summary = summary
    conversation.ai_action_items = action_items
    conversation.ai_keywords = keywords
    conversation.ai_processed = True
    conversation.save()
```

### 3. AI Processor Calls Bedrock

```python
# apps/conversations/ai_processor.py
class AIProcessor:
    def generate_summary(self, content):
        prompt = f"Summarize this conversation: {content}"
        return self._call_claude(prompt)
    
    def _call_claude(self, prompt):
        response = self.bedrock.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=json.dumps({
                "messages": [{"role": "user", "content": prompt}]
            })
        )
        return response['content'][0]['text']
```

## Monitoring

### Check Celery Status

```bash
# In Celery terminal, look for:
celery@HOSTNAME ready.
```

### Check Redis Queue

```bash
docker exec -it recall-redis redis-cli

# Inside redis-cli:
KEYS *
LLEN celery
```

### Check Task Results

```bash
# In Django shell
python manage.py shell

from apps.conversations.models import Conversation
conv = Conversation.objects.last()
print(conv.ai_summary)
print(conv.ai_action_items)
print(conv.ai_keywords)
```

### Health Check Endpoint

```bash
curl http://localhost:8000/api/health/
```

Returns:
```json
{
  "status": "healthy",
  "components": {
    "database": "ok",
    "redis": "ok",
    "aws": "configured",
    "chromadb": "ok"
  }
}
```

## Troubleshooting

### Redis Connection Failed

**Error:** `redis.exceptions.ConnectionError`

**Solution:**
```bash
# Check if Redis is running
docker ps

# Restart Redis
docker-compose down
docker-compose up -d

# Test connection
docker exec -it recall-redis redis-cli ping
```

### Celery Not Processing Tasks

**Error:** Tasks stay in queue, never execute

**Solution:**
```bash
# Check Celery logs for errors
# Look for "ready" message

# Restart Celery
# Ctrl+C in Celery terminal
start-celery.bat
```

### AWS Bedrock Errors

**Error:** `botocore.exceptions.NoCredentialsError`

**Solution:**
```bash
# Check .env file has AWS credentials
# Verify credentials are valid
# Check AWS region is correct (us-east-1)
```

### Windows-Specific Issues

**Error:** `celery.platforms.C_FORCE_ROOT`

**Solution:** Already handled with `--pool=solo` flag in `start-celery.bat`

**Error:** `ImportError: No module named 'celery'`

**Solution:**
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

## Production Deployment

### Use Managed Redis

**AWS ElastiCache:**
```env
REDIS_URL=redis://your-elasticache-endpoint:6379/0
```

**Redis Cloud:**
```env
REDIS_URL=redis://default:password@endpoint:port/0
```

### Multiple Celery Workers

```bash
# Worker 1 - High priority
celery -A config worker -Q high_priority -l info

# Worker 2 - Default
celery -A config worker -Q default -l info

# Worker 3 - Low priority
celery -A config worker -Q low_priority -l info
```

### Supervisor Configuration

```ini
[program:celery]
command=/path/to/venv/bin/celery -A config worker -l info
directory=/path/to/backend
user=www-data
autostart=true
autorestart=true
```

### Monitoring with Flower

```bash
pip install flower
celery -A config flower
# Open http://localhost:5555
```

## Performance Tuning

### Celery Settings

```python
# config/settings.py
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
```

### Redis Settings

```yaml
# docker-compose.yml
services:
  redis:
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Task Priorities

```python
# High priority
process_conversation_ai.apply_async(
    args=[conversation_id],
    priority=9
)

# Low priority
process_conversation_ai.apply_async(
    args=[conversation_id],
    priority=1
)
```

## Cost Optimization

### Amazon Bedrock Pricing

- Claude-3 Haiku: ~$0.00025 per 1K input tokens
- Average conversation: ~500 tokens
- Cost per conversation: ~$0.000125

### Batch Processing

```python
# Process multiple conversations at once
@shared_task
def batch_process_conversations(conversation_ids):
    for conv_id in conversation_ids:
        process_conversation_ai(conv_id)
```

### Caching

```python
# Cache AI results for similar content
from django.core.cache import cache

def generate_summary(self, content):
    cache_key = f"summary_{hash(content)}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    summary = self._call_claude(content)
    cache.set(cache_key, summary, timeout=3600)
    return summary
```

## Testing

### Unit Tests

```python
# tests/test_ai_processing.py
from apps.conversations.tasks import process_conversation_ai

def test_ai_processing():
    conversation = Conversation.objects.create(...)
    result = process_conversation_ai(conversation.id)
    
    conversation.refresh_from_db()
    assert conversation.ai_processed
    assert conversation.ai_summary
```

### Integration Tests

```bash
# Create test conversation
curl -X POST http://localhost:8000/api/conversations/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "Test content", "post_type": "update"}'

# Wait 5 seconds
sleep 5

# Check if AI processed
curl http://localhost:8000/api/conversations/1/
```

## Summary

✅ Redis running in Docker
✅ Celery worker processing tasks
✅ Amazon Bedrock generating AI content
✅ Async processing doesn't block UI
✅ Graceful degradation if Redis unavailable
✅ Health check endpoint for monitoring
✅ Production-ready configuration

**Next Steps:**
1. Start all services: `start-all.bat`
2. Create a conversation in the UI
3. Wait 5-10 seconds
4. Refresh to see AI summary
