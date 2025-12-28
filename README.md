# Recall - Knowledge-First Collaboration Platform

A production-ready, AI-native collaboration platform that transforms organizational conversations into structured, searchable company memory.

## Architecture Overview

### Backend (Django)
- **Organizations**: Multi-tenant architecture with role-based access
- **Conversations**: Structured posts (Update, Decision, Question, Proposal)
- **Decisions**: Extracted and tracked organizational decisions
- **Knowledge**: Semantic search with vector embeddings
- **AI Processing**: Async summarization and extraction using Amazon Bedrock

### Frontend (React)
- Role-aware conversation feeds
- Decision timeline visualization
- Natural language knowledge search
- Clean, responsive UI with Tailwind CSS

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 13+
- Redis 6+
- AWS Account (for Bedrock API)

### Backend Setup

1. **Create virtual environment**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database and AWS credentials
```

4. **Setup database**
```bash
python manage.py makemigrations
python manage.py migrate
```

5. **Create organization and admin**
```bash
python manage.py setup_org --org-name "Your Company" --org-slug "your-company" --admin-username "admin" --admin-password "secure-password"
```

6. **Test system**
```bash
python test_system.py
```

7. **Start services**
```bash
# From project root:

# Terminal 1: Redis (Docker)
start-redis.bat

# Terminal 2: Django server
start-backend.bat

# Terminal 3: Celery worker
start-celery.bat
```

### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Start development server**
```bash
# From project root:
start-frontend.bat

# Or from frontend directory:
npm start
```

## Complete Startup

For detailed startup instructions, see [STARTUP_GUIDE.md](STARTUP_GUIDE.md)

**Quick Start:**
```bash
# 1. Start Redis (requires Docker Desktop)
start-redis.bat

# 2. Start Backend
start-backend.bat

# 3. Start Celery
start-celery.bat

# 4. Start Frontend
start-frontend.bat
```

## Core Features

### 1. Structured Conversations
- **Post Types**: Update, Decision, Question, Proposal
- **AI Processing**: Automatic summarization and action item extraction
- **Role-Based Filtering**: Different content priorities per role

### 2. Decision Tracking
- **Automatic Extraction**: AI identifies decisions from conversations
- **Timeline View**: Chronological decision history
- **Impact Assessment**: Track decision outcomes

### 3. Knowledge Search
- **Semantic Search**: Natural language queries using vector embeddings
- **Context Retrieval**: Find relevant past conversations and decisions
- **Trending Topics**: Identify frequently discussed themes

### 4. Role-Based Access
- **Admin**: Full access to all content and settings
- **Manager**: Focus on decisions and proposals
- **Contributor**: Primarily updates and questions

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration (admin-only)

### Conversations
- `GET /api/conversations/` - List conversations (role-filtered)
- `POST /api/conversations/` - Create new conversation
- `GET /api/conversations/{id}/replies/` - Get conversation replies

### Decisions
- `GET /api/decisions/` - List decisions
- `POST /api/decisions/{id}/approve/` - Approve decision
- `GET /api/decisions/timeline/` - Decision timeline

### Knowledge
- `POST /api/knowledge/search/` - Semantic search
- `GET /api/knowledge/recent_decisions/` - Recent decisions
- `GET /api/knowledge/trending_topics/` - Trending topics

## AI Integration

### Amazon Bedrock Integration
The platform uses Amazon Bedrock (Claude-3 Haiku) for:
- **Conversation Summarization**: Extract key points from discussions
- **Action Item Extraction**: Identify tasks and assignments
- **Decision Analysis**: Extract decision rationale and impact

### Vector Search
- **ChromaDB**: Local vector database for semantic search
- **Sentence Transformers**: Generate embeddings for content
- **Automatic Indexing**: All content automatically indexed for search

## Security Features

- **JWT Authentication**: Secure API access
- **Organization Isolation**: Complete data separation between orgs
- **Role-Based Permissions**: Granular access control
- **Input Validation**: Comprehensive data validation

## Deployment

### Production Checklist
- [ ] Set `DEBUG=False` in settings
- [ ] Configure production database
- [ ] Set up Redis cluster
- [ ] Configure AWS credentials
- [ ] Set up SSL certificates
- [ ] Configure static file serving
- [ ] Set up monitoring and logging

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Development

### Adding New Features
1. Create Django app: `python manage.py startapp feature_name`
2. Add models in `models.py`
3. Create API views in `views.py`
4. Add URL patterns in `urls.py`
5. Create React components in `frontend/src/`

### AI Prompt Engineering
Modify prompts in `apps/conversations/ai_processor.py` to improve:
- Summary quality
- Action item extraction accuracy
- Decision identification

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Submit pull request with detailed description

## License

MIT License - see LICENSE file for details