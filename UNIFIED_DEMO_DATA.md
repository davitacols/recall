# Unified System Demo Data

## Organization
- **Name**: TechCorp
- **Project**: Authentication System (AUTH)
- **Sprint**: Sprint 1: Core Auth (Active)

---

## Issues (5 Total)

### AUTH-1: Implement JWT token generation
- **Status**: In Progress
- **Assignee**: Alice Chen
- **Story Points**: 8
- **PR**: https://github.com/techcorp/auth/pull/101
- **Code Review**: Approved
- **CI Status**: Passed (92% coverage)
- **Branch**: feature/jwt-tokens
- **Linked Decision**: "Use JWT for authentication" (enables)
- **Linked Conversation**: "JWT implementation details"
- **Linked Blocker**: "Waiting for security review"

### AUTH-2: Add token refresh endpoint
- **Status**: In Progress
- **Assignee**: Bob Smith
- **Story Points**: 5
- **PR**: https://github.com/techcorp/auth/pull/102
- **Code Review**: Pending
- **CI Status**: Running (88% coverage)
- **Branch**: feature/refresh-tokens
- **Linked Decision**: "Use JWT for authentication" (enables)

### AUTH-3: Implement token blacklist with Redis
- **Status**: To Do
- **Assignee**: Unassigned
- **Story Points**: 5
- **Linked Decision**: "Use Redis for token blacklist" (enables)
- **Linked Conversation**: "Redis integration for token management"
- **Linked Blocker**: "Redis infrastructure not ready"

### AUTH-4: User registration endpoint
- **Status**: Done
- **Assignee**: Charlie Davis
- **Story Points**: 8
- **PR**: https://github.com/techcorp/auth/pull/99
- **Code Review**: Merged
- **CI Status**: Passed (95% coverage)
- **Branch**: feature/user-registration

### AUTH-5: Add password hashing with bcrypt
- **Status**: In Review
- **Assignee**: Charlie Davis
- **Story Points**: 3
- **PR**: https://github.com/techcorp/auth/pull/103
- **Code Review**: Changes Requested
- **CI Status**: Passed (98% coverage)
- **Branch**: feature/password-hashing
- **Linked Decision**: "Use bcrypt for password hashing" (enables)
- **Linked Conversation**: "Password security best practices"
- **Linked Blocker**: "Address code review feedback"

---

## Decisions (3 Total)

### Decision 1: Use JWT for authentication
- **Status**: Approved
- **Impact Level**: High
- **Decision Maker**: Alice Chen
- **Rationale**: Scalable, stateless, works well with microservices
- **Linked Issues**: AUTH-1, AUTH-2
- **Linked Conversation**: "JWT implementation details"

### Decision 2: Use Redis for token blacklist
- **Status**: Approved
- **Impact Level**: Medium
- **Decision Maker**: Bob Smith
- **Rationale**: Redis provides O(1) lookup and automatic expiration
- **Linked Issues**: AUTH-3
- **Linked Conversation**: "Redis integration for token management"

### Decision 3: Use bcrypt for password hashing
- **Status**: Approved
- **Impact Level**: High
- **Decision Maker**: Alice Chen
- **Rationale**: Industry standard, resistant to GPU attacks
- **Linked Issues**: AUTH-5
- **Linked Conversation**: "Password security best practices"

---

## Conversations (3 Total)

### Conversation 1: JWT implementation details
- **Author**: Alice Chen
- **Type**: Discussion
- **Content**: Discussing token expiration, refresh tokens, and security
- **Linked Issues**: AUTH-1
- **Linked Decision**: "Use JWT for authentication"
- **Linked Blocker**: "Waiting for security review"

### Conversation 2: Redis integration for token management
- **Author**: Bob Smith
- **Type**: Discussion
- **Content**: Discussing Redis setup, connection pooling, and TTL strategy
- **Linked Issues**: AUTH-3
- **Linked Decision**: "Use Redis for token blacklist"
- **Linked Blocker**: "Redis infrastructure not ready"

### Conversation 3: Password security best practices
- **Author**: Alice Chen
- **Type**: Discussion
- **Content**: Discussing bcrypt vs argon2, salt rounds, and timing attacks
- **Linked Issues**: AUTH-5
- **Linked Decision**: "Use bcrypt for password hashing"
- **Linked Blocker**: "Address code review feedback"

---

## Blockers (3 Total)

### Blocker 1: Waiting for security review
- **Type**: Decision Needed
- **Status**: Active
- **Blocked By**: Alice Chen
- **Assigned To**: Charlie Davis
- **Description**: Need security team approval before merging JWT implementation
- **Linked Issue**: AUTH-1
- **Linked Conversation**: "JWT implementation details"

### Blocker 2: Redis infrastructure not ready
- **Type**: Dependency
- **Status**: Active
- **Blocked By**: Bob Smith
- **Assigned To**: Charlie Davis
- **Description**: DevOps team still setting up Redis cluster
- **Linked Issue**: AUTH-3
- **Linked Conversation**: "Redis integration for token management"

### Blocker 3: Address code review feedback
- **Type**: Technical
- **Status**: Active
- **Blocked By**: Bob Smith
- **Assigned To**: Charlie Davis
- **Description**: Need to add more test cases for edge cases
- **Linked Issue**: AUTH-5
- **Linked Conversation**: "Password security best practices"

---

## Unified Relationships Summary

### Decision → Issue Links (4)
1. Decision 1 enables Issue AUTH-1
2. Decision 1 enables Issue AUTH-2
3. Decision 2 enables Issue AUTH-3
4. Decision 3 enables Issue AUTH-5

### Conversation → Issue Links (3)
1. Conversation 1 linked to Issue AUTH-1
2. Conversation 2 linked to Issue AUTH-3
3. Conversation 3 linked to Issue AUTH-5

### Blocker → Issue Links (3)
1. Blocker 1 blocks Issue AUTH-1
2. Blocker 2 blocks Issue AUTH-3
3. Blocker 3 blocks Issue AUTH-5

---

## How to View

1. **Frontend Dashboard**: http://localhost:3000/projects/16/manage
2. **Sprint Tab**: See Kanban board with all issues and their linked context
3. **Issue Cards**: Hover over issues to see:
   - PR status and code review
   - CI/CD pipeline status
   - Test coverage
   - Linked decisions count
   - Linked conversations count
   - Linked blockers count

---

## API Endpoints to Test

### Get Unified Issues
```bash
GET /api/agile/projects/16/issues/unified/
```

Response includes all issues with:
- Basic issue data
- Developer fields (PR, CI/CD, test coverage)
- Linked decision IDs
- Linked conversation IDs
- Linked blocker IDs

### Link Decision to Issue
```bash
POST /api/agile/decisions/1/link-issue/
{
  "issue_id": 1,
  "impact_type": "enables"
}
```

### Link Conversation to Issue
```bash
POST /api/agile/conversations/1/link-issue/
{
  "issue_id": 1
}
```

### Link Blocker to Issue
```bash
POST /api/agile/blockers/1/link-issue/
{
  "issue_id": 1
}
```

---

## Key Features Demonstrated

1. **Unified Context**: Each issue shows all related decisions, conversations, and blockers
2. **Developer Integration**: PR URLs, code review status, CI/CD status, and test coverage visible
3. **Traceability**: Full audit trail from decision → conversation → blocker → issue
4. **Sprint Alignment**: All context tied to sprint timeline
5. **Team Collaboration**: Multiple team members (Alice, Bob, Charlie) working on related issues
