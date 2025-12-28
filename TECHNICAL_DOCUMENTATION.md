# Recall - Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Database Schema](#database-schema)
6. [Security](#security)
7. [Deployment](#deployment)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## System Overview

Recall is an AI-powered knowledge management platform that transforms organizational conversations into structured, searchable company memory.

**Key Features:**
- Structured conversations (Update/Decision/Question/Proposal)
- AI-powered summarization and action item extraction
- Decision tracking with full lifecycle management
- Semantic search using vector embeddings
- Role-based access control
- Multi-tenant architecture

---

## Technology Stack

### Backend
- **Framework**: Django 4.2+
- **API**: Django REST Framework
- **Database**: PostgreSQL 13+ (SQLite for dev)
- **Cache/Queue**: Redis 6+
- **Task Queue**: Celery 5+
- **AI**: Amazon Bedrock (Claude-3 Haiku)
- **Vector DB**: ChromaDB
- **Embeddings**: Sentence Transformers

### Frontend
- **Framework**: React 18+
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Routing**: React Router
- **State**: React Hooks

### Infrastructure
- **Containerization**: Docker
- **Web Server**: Nginx (production)
- **WSGI**: Gunicorn
- **Process Manager**: Supervisor

---

## Installation

### Prerequisites
```bash
# System requirements
Python 3.9+
Node.js 16+
PostgreSQL 13+
Redis 6+
AWS Account (for Bedrock)
```

### Backend Setup

1. **Clone repository**
```bash
git clone https://github.com/your-org/recall.git
cd recall/backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your credentials
```

5. **Setup database**
```bash
python manage.py makemigrations
python manage.py migrate
```

6. **Create organization and admin**
```bash
python manage.py setup_org \
  --org-name "Your Company" \
  --org-slug "your-company" \
  --admin-username "admin" \
  --admin-password "secure-password"
```

7. **Start services**
```bash
# Terminal 1: Django
python manage.py runserver

# Terminal 2: Celery
celery -A config worker -l info

# Terminal 3: Redis
redis-server
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Access: http://localhost:3000

---

## Configuration

### Environment Variables

**Required:**
```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/recall

# Redis
REDIS_URL=redis://localhost:6379/0

# ChromaDB
CHROMA_PERSIST_DIRECTORY=./chroma_db
```

**Optional:**
```bash
# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-password

# Logging
LOG_LEVEL=INFO
```

### Django Settings

**Production settings** (`config/settings.py`):
```python
DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'recall',
        'USER': 'recall_user',
        'PASSWORD': 'secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Security
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
```

---

## Database Schema

### Core Tables

**organizations**
- `id`: Primary key
- `name`: Organization name
- `slug`: URL-friendly identifier
- `max_users`: User limit
- `ai_processing_enabled`: Feature flag

**users**
- `id`: Primary key
- `username`: Unique per organization
- `organization_id`: Foreign key
- `role`: admin/manager/contributor
- `email`: Email address

**conversations**
- `id`: Primary key
- `organization_id`: Foreign key
- `author_id`: Foreign key
- `post_type`: update/decision/question/proposal
- `title`: Conversation title
- `content`: Main content
- `ai_summary`: AI-generated summary
- `ai_action_items`: JSON array
- `ai_processed`: Boolean flag

**decisions**
- `id`: Primary key
- `organization_id`: Foreign key
- `conversation_id`: Foreign key
- `decision_maker_id`: Foreign key
- `title`: Decision title
- `status`: proposed/approved/implemented
- `rationale`: Decision reasoning
- `impact_level`: low/medium/high/critical

**action_items**
- `id`: Primary key
- `conversation_id`: Foreign key
- `assignee_id`: Foreign key
- `title`: Action description
- `status`: pending/in_progress/completed
- `due_date`: Deadline

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_conversations_org_type ON conversations(organization_id, post_type, created_at);
CREATE INDEX idx_decisions_org_status ON decisions(organization_id, status, created_at);
CREATE INDEX idx_users_org_role ON users(organization_id, role);
```

---

## Security

### Authentication
- JWT tokens with 1-hour expiry
- Refresh tokens with 7-day expiry
- Secure password hashing (PBKDF2)

### Authorization
- Role-based access control (RBAC)
- Organization-level data isolation
- Permission checks on all endpoints

### Data Protection
- HTTPS only in production
- SQL injection prevention (ORM)
- XSS protection (React escaping)
- CSRF tokens on state-changing requests
- Input validation and sanitization

### AWS Security
- IAM roles with minimal permissions
- Credentials in environment variables
- Encrypted data in transit

---

## Deployment

### Docker Deployment

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: recall
      POSTGRES_USER: recall_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql://recall_user:secure_password@db:5432/recall
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  celery:
    build: ./backend
    command: celery -A config worker -l info
    volumes:
      - ./backend:/app
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
  redis_data:
```

**Build and run:**
```bash
docker-compose up -d
```

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Configure production database (PostgreSQL)
- [ ] Set up Redis cluster
- [ ] Configure AWS credentials
- [ ] Set up SSL certificates (Let's Encrypt)
- [ ] Configure static file serving (S3/CDN)
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Configure backups (daily database dumps)
- [ ] Set up log aggregation (ELK, CloudWatch)
- [ ] Configure firewall rules
- [ ] Set up CI/CD pipeline
- [ ] Load testing
- [ ] Security audit

### AWS Deployment

**Recommended Architecture:**
- **Compute**: ECS Fargate or EC2
- **Database**: RDS PostgreSQL
- **Cache**: ElastiCache Redis
- **Storage**: S3 for static files
- **CDN**: CloudFront
- **Load Balancer**: ALB
- **AI**: Bedrock (already configured)

---

## Monitoring

### Application Metrics
```python
# Key metrics to track
- API response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Request throughput (req/sec)
- Database query time
- Celery task queue depth
- AI processing success rate
```

### Health Checks

**Backend:**
```bash
curl http://localhost:8000/health/
```

**Celery:**
```bash
celery -A config inspect ping
```

**Redis:**
```bash
redis-cli ping
```

### Logging

**Django logging configuration:**
```python
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'logs/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}
```

---

## Troubleshooting

### Common Issues

**1. AI Processing Fails**
```bash
# Check AWS credentials
aws bedrock list-foundation-models --region us-east-1

# Check Celery logs
celery -A config inspect active
```

**2. Search Not Working**
```bash
# Rebuild ChromaDB index
python manage.py rebuild_search_index
```

**3. Database Connection Errors**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U recall_user -d recall -h localhost
```

**4. Redis Connection Issues**
```bash
# Check Redis status
redis-cli ping

# Check connections
redis-cli client list
```

### Performance Optimization

**Database:**
```sql
-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM conversations WHERE organization_id = 1;

-- Add missing indexes
CREATE INDEX idx_custom ON table_name(column_name);
```

**Caching:**
```python
# Cache expensive queries
from django.core.cache import cache

result = cache.get('key')
if not result:
    result = expensive_query()
    cache.set('key', result, 3600)  # 1 hour
```

---

## Roadmap

### Phase 1 (Current)
- ✅ Core conversation management
- ✅ AI summarization
- ✅ Decision tracking
- ✅ Semantic search

### Phase 2 (Q2 2024)
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Integrations (Slack, Teams)

### Phase 3 (Q3 2024)
- [ ] Custom AI models
- [ ] Workflow automation
- [ ] Advanced permissions
- [ ] API webhooks

---

## Support

**Documentation**: https://docs.recall.app
**Issues**: https://github.com/your-org/recall/issues
**Email**: support@recall.app
**Slack**: https://recall-community.slack.com

---

## License

MIT License - see LICENSE file for details.
