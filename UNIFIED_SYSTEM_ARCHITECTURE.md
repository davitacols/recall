# Unified Project Management System - Architecture Overview

## System Unification Status: ✅ COMPLETE

The Recall system is now fully unified with coordinated integration between Decisions, Conversations, Blockers, and Issues.

---

## Core Components

### 1. **Frontend - ProjectManagement Dashboard** (`/projects/:projectId/manage`)
- **Unified Tabs**: Sprint | Backlog | Code | Insights
- **Coordinated Data Fetching**: Single endpoint returns issues with all linked context
- **Visual Indicators**: 
  - 📝 PR linked (code review status)
  - 🔄 CI/CD status (pipeline status)
  - 📋 Decisions linked (count)
  - 💬 Conversations linked (count)
  - 🚫 Blockers linked (count)

### 2. **Backend - Unified Data Models**

#### Issue Model (Enhanced)
```
- Developer Fields: branch_name, pr_url, commit_hash, code_review_status
- CI/CD Fields: ci_status, ci_url, test_coverage
- Relationships: Linked to Decisions, Conversations, Blockers
```

#### New Linking Models
- **DecisionIssueLink**: Connects decisions to issues (impact_type: blocks/enables/relates_to)
- **ConversationIssueLink**: Connects conversations to issues
- **BlockerIssueLink**: Connects blockers to issues

#### Supporting Models
- **CodeCommit**: Tracks git commits linked to issues
- **PullRequest**: Tracks PR status and reviews

### 3. **API Endpoints**

#### Unified Issues Endpoint
```
GET /api/agile/projects/{projectId}/issues/unified/
```
Returns issues with:
- Basic issue data (key, title, status, priority, assignee, story_points)
- Developer data (pr_url, code_review_status, ci_status, test_coverage)
- Linked context (linked_decisions[], linked_conversations[], blocking_blockers[])

#### Linking Endpoints
```
POST /api/agile/decisions/{decisionId}/link-issue/
POST /api/agile/conversations/{conversationId}/link-issue/
POST /api/agile/blockers/{blockerId}/link-issue/
```

#### Related Context Endpoints
```
GET /api/conversations/{conversationId}/related-decisions/
GET /api/decisions/{decisionId}/related-sprints/
```

---

## Data Flow

### Creating an Issue with Context
1. Create Issue in ProjectManagement
2. Link Decision → Issue (DecisionIssueLink)
3. Link Conversation → Issue (ConversationIssueLink)
4. Link Blocker → Issue (BlockerIssueLink)
5. Add PR URL → Tracked in Issue.pr_url
6. CI/CD status → Tracked in Issue.ci_status

### Viewing Unified Context
1. User navigates to `/projects/{projectId}/manage`
2. Frontend fetches from `/api/agile/projects/{projectId}/issues/unified/`
3. Backend returns issues with all linked relationships
4. Frontend displays visual indicators for each linked item

---

## Key Features

### 1. **Decision-Issue Linking**
- Decisions can block, enable, or relate to issues
- Decisions appear in issue context
- Issues appear in decision context

### 2. **Conversation-Issue Linking**
- Conversations (discussions) linked to issues
- Related decisions auto-discovered through shared issues
- Conversation timeline visible in issue detail

### 3. **Blocker-Issue Linking**
- Blockers explicitly linked to issues they block
- Blocker status affects issue progress
- Blocker resolution tracked

### 4. **Developer Integration**
- PR URLs stored and tracked
- Code review status monitored
- CI/CD pipeline status visible
- Test coverage metrics displayed
- Branch names tracked

### 5. **Sprint Context**
- Issues grouped by sprint
- Decisions made during sprint visible
- Blockers affecting sprint tracked
- Retrospective insights linked

---

## Database Schema

### New Tables
- `decision_issue_links` - Connects decisions to issues
- `conversation_issue_links` - Connects conversations to issues
- `blocker_issue_links` - Connects blockers to issues
- `code_commits` - Tracks git commits
- `pull_requests` - Tracks PR status

### Enhanced Tables
- `issues` - Added developer fields (branch_name, pr_url, commit_hash, code_review_status, ci_status, ci_url, test_coverage)

---

## Frontend Components

### ProjectManagement.js
- **Sprint Tab**: Kanban board with issue cards showing linked context
- **Backlog Tab**: Unscheduled issues with status indicators
- **Code Tab**: PR status and CI/CD pipeline visualization
- **Insights Tab**: Velocity, burndown, code quality metrics

### Issue Card Display
```
[KEY] Title
Assignee | Story Points
📝 PR linked (if pr_url exists)
🔄 CI Status (if ci_status exists)
📋 N decision(s) (if linked_decisions exists)
💬 N conversation(s) (if linked_conversations exists)
🚫 N blocker(s) (if blocking_blockers exists)
```

---

## Integration Points

### 1. Decision → Issue
- Decision can impact multiple issues
- Impact type: blocks, enables, relates_to
- Visible in issue detail and ProjectManagement

### 2. Conversation → Issue
- Discussion linked to specific issue
- Related decisions auto-discovered
- Conversation timeline in issue context

### 3. Blocker → Issue
- Blocker explicitly blocks issue
- Blocker status affects issue progress
- Resolution tracked

### 4. Sprint → All
- Sprint contains issues
- Decisions made during sprint
- Blockers affecting sprint
- Retrospective insights

---

## Usage Examples

### Link Decision to Issue
```bash
POST /api/agile/decisions/1/link-issue/
{
  "issue_id": 42,
  "impact_type": "blocks"
}
```

### Link Conversation to Issue
```bash
POST /api/agile/conversations/5/link-issue/
{
  "issue_id": 42
}
```

### Link Blocker to Issue
```bash
POST /api/agile/blockers/3/link-issue/
{
  "issue_id": 42
}
```

### Get Issues with Unified Context
```bash
GET /api/agile/projects/1/issues/unified/
```

Response includes:
- Issue data
- PR/CI/CD status
- Linked decision IDs
- Linked conversation IDs
- Linked blocker IDs

---

## Benefits

1. **Holistic View**: See decisions, conversations, and blockers affecting each issue
2. **Context Preservation**: No information silos
3. **Developer-Centric**: PR, CI/CD, and code metrics integrated
4. **Sprint Alignment**: All context tied to sprint timeline
5. **Traceability**: Full audit trail of decisions and their impact
6. **Collaboration**: Teams see related discussions and decisions

---

## Future Enhancements

1. **Automation**: Auto-link decisions to issues based on keywords
2. **Analytics**: Track decision impact on issue resolution time
3. **Notifications**: Alert when linked decision/blocker status changes
4. **Webhooks**: Sync with GitHub/GitLab for PR/CI updates
5. **AI Insights**: Suggest related decisions/conversations for new issues
