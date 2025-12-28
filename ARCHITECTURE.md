# Recall - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React Frontend (Getty Images Design)                    │   │
│  │  - Dashboard, Conversations, Decisions, Knowledge Search │   │
│  │  - JWT Authentication                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS/REST API
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Django REST Framework                                    │   │
│  │  ├─ Auth API (JWT)                                        │   │
│  │  ├─ Conversations API                                     │   │
│  │  ├─ Decisions API                                         │   │
│  │  ├─ Knowledge Search API                                  │   │
│  │  └─ Organizations API                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Celery Workers (Async Tasks)                            │   │
│  │  ├─ AI Summarization                                      │   │
│  │  ├─ Action Item Extraction                               │   │
│  │  ├─ Decision Extraction                                   │   │
│  │  └─ Vector Embedding Generation                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Redis (Message Broker + Cache)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         AI LAYER                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Amazon Bedrock (Claude-3 Haiku)                         │   │
│  │  - Text Summarization                                     │   │
│  │  - Entity Extraction                                      │   │
│  │  - Decision Analysis                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Sentence Transformers                                    │   │
│  │  - Generate embeddings for semantic search               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL / SQLite                                      │   │
│  │  - Organizations, Users, Conversations, Decisions         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ChromaDB (Vector Database)                              │   │
│  │  - Semantic search index                                  │   │
│  │  - Conversation embeddings                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Request/Response Lifecycle

### 1. User Creates Conversation
```
User → React → POST /api/conversations/
                ↓
            Django View validates & saves to PostgreSQL
                ↓
            Returns 201 Created with conversation ID
                ↓
            Triggers Celery task: process_conversation.delay(id)
                ↓
            Celery Worker:
              1. Calls Amazon Bedrock for summary
              2. Extracts action items
              3. Generates embeddings
              4. Stores in ChromaDB
              5. Updates conversation.ai_processed = True
```

### 2. User Searches Knowledge
```
User → React → POST /api/knowledge/search/ {"query": "Q4 planning"}
                ↓
            Django View:
              1. Generate query embedding (Sentence Transformers)
              2. Query ChromaDB for similar vectors
              3. Fetch matching conversations from PostgreSQL
              4. Return ranked results
                ↓
            React displays masonry grid of results
```

### 3. Decision Extraction (Automatic)
```
Conversation saved → Celery task analyzes content
                ↓
            Amazon Bedrock identifies decision patterns
                ↓
            If decision detected:
              - Create Decision record
              - Link to conversation
              - Set status = 'proposed'
              - Notify stakeholders
```

## Component Responsibilities

### Django Apps

**organizations/**
- Multi-tenant organization management
- User authentication & roles
- Organization-level settings

**conversations/**
- CRUD for conversations & replies
- Post type handling (Update/Decision/Question/Proposal)
- AI processing orchestration

**decisions/**
- Decision lifecycle management
- Status tracking (Proposed → Approved → Implemented)
- Impact assessment

**knowledge/**
- Semantic search engine
- Vector database integration
- Trending topics analysis

**users/**
- JWT authentication
- User profile management
- Role-based permissions

### Celery Tasks

**process_conversation(conversation_id)**
- Generate AI summary
- Extract action items
- Extract keywords
- Create vector embeddings
- Index in ChromaDB

**extract_decisions(conversation_id)**
- Analyze conversation for decisions
- Create Decision records
- Notify decision makers

**update_search_index()**
- Periodic reindexing
- Update trending topics
- Clean up old embeddings

### AI Pipeline

**Amazon Bedrock Integration**
- Model: Claude-3 Haiku (fast, cost-effective)
- Use cases:
  - Summarization (2-3 sentences)
  - Action item extraction (JSON format)
  - Decision identification
  - Keyword extraction

**Vector Search**
- Model: all-MiniLM-L6-v2 (Sentence Transformers)
- Embedding dimension: 384
- Storage: ChromaDB
- Similarity: Cosine similarity

## Data Flow Patterns

### Write Path (Create Conversation)
```
Client → API → PostgreSQL → Celery → Bedrock → ChromaDB
         ↓
      Return immediately (async processing)
```

### Read Path (Search)
```
Client → API → ChromaDB (vector search) → PostgreSQL (fetch details) → Client
```

### Real-time Updates
```
Celery completes → Update PostgreSQL → WebSocket/Polling → Client refresh
```

## Security Architecture

**Authentication**
- JWT tokens (access + refresh)
- Token expiry: 1 hour
- Refresh token: 7 days

**Authorization**
- Role-based access control (Admin/Manager/Contributor)
- Organization-level data isolation
- Row-level security in queries

**Data Protection**
- All API calls over HTTPS
- AWS credentials in environment variables
- Database connection encryption
- Input validation & sanitization

## Scalability Considerations

**Horizontal Scaling**
- Stateless Django instances (scale with load balancer)
- Multiple Celery workers (scale by queue depth)
- Redis cluster for high availability

**Vertical Scaling**
- PostgreSQL read replicas
- ChromaDB sharding by organization
- CDN for static assets

**Performance Optimization**
- Redis caching (search results, user sessions)
- Database indexing on common queries
- Lazy loading of AI summaries
- Pagination on all list endpoints

## Monitoring & Observability

**Metrics to Track**
- API response times
- Celery task queue depth
- AI processing success rate
- Search query latency
- Database connection pool usage

**Logging**
- Application logs (Django)
- Task logs (Celery)
- AI API calls (Bedrock)
- Error tracking (exceptions)

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Tailwind | User interface |
| API | Django REST Framework | Backend API |
| Database | PostgreSQL/SQLite | Relational data |
| Vector DB | ChromaDB | Semantic search |
| Queue | Redis + Celery | Async processing |
| AI | Amazon Bedrock | Text analysis |
| Embeddings | Sentence Transformers | Vector generation |
| Auth | JWT | Authentication |
| Deployment | Docker | Containerization |
