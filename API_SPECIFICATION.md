# Recall API Specification

Base URL: `http://localhost:8000/api`

## Authentication

All endpoints except `/auth/login/` require JWT authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST /auth/login/
Login and receive JWT tokens.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123",
  "organization": "demo"
}
```

**Response (200):**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "organization": "demo"
  }
}
```

### POST /auth/refresh/
Refresh access token.

**Request:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response (200):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

## Conversation Endpoints

### GET /conversations/
List conversations (role-filtered).

**Query Parameters:**
- `post_type` (optional): filter by type (update/decision/question/proposal)
- `page` (optional): page number (default: 1)
- `page_size` (optional): items per page (default: 20)

**Response (200):**
```json
{
  "count": 45,
  "next": "http://localhost:8000/api/conversations/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Q4 Planning Discussion",
      "content": "We need to finalize our Q4 roadmap...",
      "post_type": "update",
      "author_name": "John Doe",
      "author_id": 1,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "ai_summary": "Team discussing Q4 priorities...",
      "ai_action_items": [
        {"title": "Schedule planning meeting", "priority": "high"}
      ],
      "replies_count": 5,
      "view_count": 24,
      "is_pinned": false
    }
  ]
}
```

### POST /conversations/
Create new conversation.

**Request:**
```json
{
  "post_type": "update",
  "title": "New Feature Proposal",
  "content": "I propose we add a new analytics dashboard...",
  "priority": "high"
}
```

**Response (201):**
```json
{
  "id": 2,
  "title": "New Feature Proposal",
  "post_type": "update",
  "author_name": "Jane Smith",
  "created_at": "2024-01-15T11:00:00Z",
  "ai_processed": false
}
```

### GET /conversations/{id}/
Get conversation details.

**Response (200):**
```json
{
  "id": 1,
  "title": "Q4 Planning Discussion",
  "content": "Full content here...",
  "post_type": "update",
  "author_name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z",
  "ai_summary": "Summary here...",
  "ai_action_items": [...],
  "replies": [
    {
      "id": 1,
      "author_name": "Jane Smith",
      "content": "Great points!",
      "created_at": "2024-01-15T10:45:00Z"
    }
  ]
}
```

### POST /conversations/{id}/replies/
Add reply to conversation.

**Request:**
```json
{
  "content": "I agree with this approach."
}
```

**Response (201):**
```json
{
  "id": 2,
  "author_name": "Current User",
  "content": "I agree with this approach.",
  "created_at": "2024-01-15T11:15:00Z"
}
```

---

## Decision Endpoints

### GET /decisions/
List all decisions.

**Query Parameters:**
- `status` (optional): filter by status
- `impact_level` (optional): filter by impact
- `page` (optional): page number

**Response (200):**
```json
{
  "count": 12,
  "results": [
    {
      "id": 1,
      "title": "Adopt React for Frontend",
      "description": "Decision to use React framework...",
      "status": "approved",
      "impact_level": "high",
      "decision_maker_name": "John Doe",
      "rationale": "React provides better performance...",
      "created_at": "2024-01-10T09:00:00Z",
      "decided_at": "2024-01-12T14:30:00Z",
      "conversation_id": 5,
      "conversation_title": "Frontend Framework Discussion"
    }
  ]
}
```

### POST /decisions/
Create new decision.

**Request:**
```json
{
  "conversation_id": 5,
  "title": "Migrate to PostgreSQL",
  "description": "Decision to migrate from SQLite to PostgreSQL",
  "rationale": "Better scalability and performance",
  "impact_level": "high",
  "status": "proposed"
}
```

**Response (201):**
```json
{
  "id": 2,
  "title": "Migrate to PostgreSQL",
  "status": "proposed",
  "created_at": "2024-01-15T12:00:00Z"
}
```

### POST /decisions/{id}/approve/
Approve a decision (Admin only).

**Response (200):**
```json
{
  "id": 2,
  "status": "approved",
  "decided_at": "2024-01-15T12:30:00Z"
}
```

### GET /decisions/timeline/
Get decision timeline view.

**Response (200):**
```json
{
  "timeline": [
    {
      "date": "2024-01-15",
      "decisions": [
        {
          "id": 1,
          "title": "Adopt React",
          "status": "implemented"
        }
      ]
    }
  ]
}
```

---

## Knowledge Search Endpoints

### POST /knowledge/search/
Semantic search across all content.

**Request:**
```json
{
  "query": "Q4 planning decisions",
  "limit": 10
}
```

**Response (200):**
```json
{
  "results": [
    {
      "id": 1,
      "title": "Q4 Planning Discussion",
      "content_type": "conversation",
      "content_preview": "We need to finalize our Q4 roadmap...",
      "summary": "Team discussing Q4 priorities and goals",
      "relevance_score": 0.92,
      "created_at": "2024-01-15T10:30:00Z",
      "author": "John Doe"
    },
    {
      "id": 2,
      "title": "Approve Q4 Budget",
      "content_type": "decision",
      "content_preview": "Decision to approve $500K budget...",
      "relevance_score": 0.87,
      "created_at": "2024-01-10T14:00:00Z",
      "decision_maker": "Jane Smith"
    }
  ],
  "query_time_ms": 45
}
```

### GET /knowledge/recent_decisions/
Get recent decisions for quick access.

**Response (200):**
```json
{
  "decisions": [
    {
      "id": 1,
      "title": "Adopt React",
      "status": "approved",
      "created_at": "2024-01-10T09:00:00Z"
    }
  ]
}
```

### GET /knowledge/trending_topics/
Get trending discussion topics.

**Response (200):**
```json
{
  "topics": [
    {
      "name": "Q4 Planning",
      "count": 15,
      "trend": "up"
    },
    {
      "name": "Product Development",
      "count": 12,
      "trend": "stable"
    }
  ]
}
```

---

## Organization Endpoints

### GET /organizations/current/
Get current user's organization details.

**Response (200):**
```json
{
  "id": 1,
  "name": "Acme Corp",
  "slug": "acme-corp",
  "max_users": 50,
  "ai_processing_enabled": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### GET /organizations/stats/
Get organization statistics.

**Response (200):**
```json
{
  "total_conversations": 145,
  "total_decisions": 23,
  "active_users": 12,
  "ai_processing_rate": 0.98
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "details": {
    "title": ["This field is required"]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication credentials were not provided"
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **Anonymous**: 100 requests/hour
- **Authenticated**: 1000 requests/hour
- **Admin**: Unlimited

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642262400
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)

**Response Format:**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/conversations/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## Filtering & Sorting

**Common Filters:**
- `created_after`: ISO 8601 date
- `created_before`: ISO 8601 date
- `author`: User ID
- `search`: Text search

**Sorting:**
- `ordering`: Field name (prefix with `-` for descending)
- Example: `?ordering=-created_at`

---

## WebSocket Events (Future)

Real-time updates via WebSocket:

**Connection:**
```
ws://localhost:8000/ws/updates/?token=<jwt_token>
```

**Events:**
- `conversation.created`
- `conversation.updated`
- `decision.approved`
- `ai.processing_complete`
