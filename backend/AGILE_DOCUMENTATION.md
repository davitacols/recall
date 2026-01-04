# Recall Agile Management System - Complete Guide

## Table of Contents
1. [Project Manager Guide](#project-manager-guide)
2. [Developer Guide](#developer-guide)
3. [API Reference](#api-reference)
4. [Workflow Examples](#workflow-examples)

---

## Project Manager Guide

### Overview
The Agile Management System helps you plan, track, and manage projects through sprints and issues.

### Core Concepts

**Project**: Container for all work
- Example: "Instagram Mobile App"
- Has multiple sprints and boards
- Tracks all issues across sprints

**Sprint**: Time-boxed iteration (typically 2 weeks)
- Example: "Sprint 1: Authentication" (Jan 20 - Feb 3)
- Contains issues to be completed
- Has a goal and timeline

**Issue**: Individual task or story
- Example: "Implement JWT authentication"
- Assigned to team members
- Moves through columns: To Do → In Progress → In Review → Done

**Blocker**: Something blocking progress
- Example: "Waiting for API documentation"
- Linked to a sprint
- Can be resolved or escalated

### Step-by-Step: Managing a Project

#### 1. Create a Project
```
Dashboard → Projects → Create Project
- Name: "Instagram Mobile App"
- Key: "MOBILE" (used for issue IDs)
- Description: "Mobile app to scrape Instagram data"
- Lead: Select team lead
```
✓ Automatically creates a Kanban board with columns: To Do, In Progress, In Review, Done

#### 2. Create Sprints
```
Project Detail → Sprints → Create Sprint
- Name: "Sprint 1: Authentication"
- Start Date: Jan 20, 2025
- End Date: Feb 3, 2025 (14 days)
- Goal: "Implement user login and registration"
```

#### 3. Create Issues
```
Kanban Board → Click "+" in "To Do" column
- Title: "Design login screen"
- Priority: High
- Story Points: 5 (optional)
- Assignee: Select team member
```
✓ Issue automatically gets ID: MOBILE-1, MOBILE-2, etc.

#### 4. Assign Issues to Sprint
```
Issue Detail Panel → Sprint Dropdown → Select Sprint
```
✓ Issue now appears in sprint tracking

#### 5. Track Progress
```
Current Sprint Dashboard shows:
- Total issues: 4
- Completed: 1 (25%)
- In Progress: 1 (25%)
- To Do: 2 (50%)
- Days remaining: 10
- Active blockers: 1
```

#### 6. Report Blockers
```
Current Sprint → Blockers → Create Blocker
- Title: "Waiting for API documentation"
- Type: Dependency
- Description: "Can't proceed with auth without API specs"
- Assigned to: Senior Dev
```

#### 7. End Sprint & Retrospective
```
Sprint Detail → End Sprint
- Automatically creates retrospective
- Captures what went well
- Identifies improvements
- Generates action items
```

### Key Metrics

**Sprint Health**:
- Completion %: (Completed / Total) × 100
- Velocity: Story points completed per sprint
- Blocker count: Active blockers blocking progress
- Days remaining: Time left in sprint

**Project Health**:
- Total issues: All work in project
- Sprint count: Number of planned sprints
- Completed sprints: Historical performance
- Team capacity: Issues per team member

### Best Practices

1. **Sprint Planning**
   - Plan 2-week sprints
   - Set realistic goals
   - Include 20% buffer for unexpected work

2. **Issue Management**
   - Break down large features into smaller issues
   - Assign story points (1, 2, 3, 5, 8)
   - Set clear priorities

3. **Blocker Management**
   - Report blockers immediately
   - Assign to responsible person
   - Update status daily

4. **Sprint Reviews**
   - Review completed work
   - Discuss blockers
   - Plan next sprint

---

## Developer Guide

### Overview
As a developer, you'll work with issues on the Kanban board and update sprint progress.

### Core Workflow

#### 1. View Your Sprint
```
Dashboard → Current Sprint
Shows:
- Your assigned issues
- Sprint goal and timeline
- Team blockers
- Sprint progress
```

#### 2. Start Working on an Issue
```
Kanban Board → Click Issue → Drag to "In Progress"
```
✓ Issue status updates automatically

#### 3. Update Issue Details
```
Issue Detail Panel (right side):
- Edit title/description
- Change priority
- Add story points
- Update status
- Add comments
```

#### 4. Move Issue Through Workflow
```
To Do → In Progress → In Review → Done

Example:
1. Start: "Design login screen" [TO DO]
2. Working: Drag to [IN PROGRESS]
3. Ready for review: Drag to [IN REVIEW]
4. Approved: Drag to [DONE]
```

#### 5. Report a Blocker
```
If stuck:
Current Sprint → Blockers → Create Blocker
- Title: "Need clarification on auth flow"
- Type: Decision Needed
- Description: Explain what's blocking you
```

#### 6. Collaborate
```
Issue Detail → Comments
- Add comments for team discussion
- Tag team members
- Share solutions
```

### Issue Lifecycle

```
MOBILE-1: Implement JWT authentication

Created:
- Title: "Implement JWT authentication"
- Status: TO DO
- Assignee: John (Dev)
- Sprint: Sprint 1
- Story Points: 8

In Progress:
- John moves to IN PROGRESS
- Updates: "Started implementation"

In Review:
- John moves to IN REVIEW
- Comment: "Ready for code review"
- Sarah (Lead) reviews code

Done:
- Sarah approves
- John moves to DONE
- Comment: "Merged to main"
```

### Sprint Cycle

**Week 1-2: Development**
- Work on assigned issues
- Move issues through columns
- Report blockers
- Collaborate with team

**End of Sprint: Review**
- Demo completed work
- Discuss blockers
- Retrospective meeting
- Plan next sprint

### Commands & Tips

**Drag & Drop Issues**
- Drag issue card between columns
- Updates status automatically
- Refreshes sprint progress

**Filter Issues**
- By status: "Show only In Progress"
- By assignee: "Show my issues"
- By priority: "Show High priority"

**Search Issues**
- Search by issue key: "MOBILE-1"
- Search by title: "authentication"
- Search by assignee: "john"

---

## API Reference

### Projects

**List Projects**
```
GET /api/agile/projects/
Response: [
  {
    "id": 1,
    "name": "Instagram Mobile App",
    "key": "MOBILE",
    "issue_count": 8,
    "sprint_count": 2,
    "lead": "John Doe"
  }
]
```

**Create Project**
```
POST /api/agile/projects/
Body: {
  "name": "Instagram Mobile App",
  "key": "MOBILE",
  "description": "Mobile app to scrape Instagram data"
}
```

### Sprints

**List Sprints for Project**
```
GET /api/agile/projects/{project_id}/sprints/
Response: [
  {
    "id": 1,
    "name": "Sprint 1: Authentication",
    "start_date": "2025-01-20",
    "end_date": "2025-02-03",
    "goal": "Implement user login",
    "issue_count": 4,
    "completed_count": 1,
    "blocked_count": 1
  }
]
```

**Create Sprint**
```
POST /api/agile/projects/{project_id}/sprints/
Body: {
  "name": "Sprint 1: Authentication",
  "start_date": "2025-01-20",
  "end_date": "2025-02-03",
  "goal": "Implement user login and registration"
}
```

**Get Sprint Details**
```
GET /api/agile/sprints/{sprint_id}/detail/
Response: {
  "id": 1,
  "name": "Sprint 1: Authentication",
  "project_id": 1,
  "project_name": "Instagram Mobile App",
  "start_date": "2025-01-20",
  "end_date": "2025-02-03",
  "goal": "Implement user login",
  "issue_count": 4,
  "completed": 1,
  "in_progress": 1,
  "todo": 2,
  "issues": [
    {
      "id": 1,
      "key": "MOBILE-1",
      "title": "Design login screen",
      "status": "done",
      "assignee": "John Doe",
      "story_points": 5
    }
  ]
}
```

### Issues

**Create Issue**
```
POST /api/agile/projects/{project_id}/issues/
Body: {
  "title": "Implement JWT authentication",
  "description": "Add JWT token generation and validation",
  "priority": "high",
  "story_points": 8,
  "assignee_id": 2,
  "sprint_id": 1
}
```

**Get Issue Details**
```
GET /api/agile/issues/{issue_id}/
Response: {
  "id": 1,
  "key": "MOBILE-1",
  "title": "Design login screen",
  "description": "Create UI for login",
  "status": "in_progress",
  "priority": "high",
  "assignee": "John Doe",
  "story_points": 5,
  "sprint": "Sprint 1: Authentication",
  "comments": [
    {
      "author": "Sarah",
      "content": "Looks good, ready for review",
      "created_at": "2025-01-25T10:30:00Z"
    }
  ]
}
```

**Update Issue**
```
PUT /api/agile/issues/{issue_id}/
Body: {
  "title": "Design login screen - Updated",
  "status": "in_review",
  "assignee_id": 3
}
```

**Move Issue Between Columns**
```
POST /api/agile/issues/{issue_id}/move/
Body: {
  "column_id": 2,
  "status": "in_progress"
}
```

**Assign Issue to Sprint**
```
POST /api/agile/issues/{issue_id}/assign-sprint/
Body: {
  "sprint_id": 1
}
```

### Blockers

**List Blockers**
```
GET /api/agile/blockers/?sprint_id={sprint_id}
Response: [
  {
    "id": 1,
    "title": "Waiting for API documentation",
    "type": "dependency",
    "status": "active",
    "sprint_name": "Sprint 1: Authentication",
    "blocked_by": "John Doe",
    "assigned_to": "Sarah",
    "days_open": 2
  }
]
```

**Create Blocker**
```
POST /api/agile/blockers/
Body: {
  "sprint_id": 1,
  "title": "Waiting for API documentation",
  "description": "Can't proceed without API specs",
  "type": "dependency"
}
```

**Resolve Blocker**
```
POST /api/agile/blockers/{blocker_id}/resolve/
Response: {"message": "Blocker resolved"}
```

### Current Sprint

**Get Current Sprint Summary**
```
GET /api/agile/current-sprint/
Response: {
  "id": 1,
  "name": "Sprint 1: Authentication",
  "project_name": "Instagram Mobile App",
  "start_date": "2025-01-20",
  "end_date": "2025-02-03",
  "goal": "Implement user login",
  "days_remaining": 10,
  "issue_stats": {
    "total": 4,
    "completed": 1,
    "in_progress": 1,
    "todo": 2,
    "completion_percentage": 25
  },
  "blocker_count": 1,
  "blockers": [
    {
      "id": 1,
      "title": "Waiting for API documentation",
      "type": "dependency",
      "days_open": 2
    }
  ]
}
```

### Sprint History

**Get Past Sprints**
```
GET /api/agile/sprint-history/?project_id={project_id}
Response: [
  {
    "id": 1,
    "name": "Sprint 1: Authentication",
    "project_name": "Instagram Mobile App",
    "start_date": "2025-01-06",
    "end_date": "2025-01-19",
    "completed": 4,
    "blocked": 0,
    "decisions": 2
  }
]
```

---

## Workflow Examples

### Example 1: Project Manager Planning a Sprint

**Day 1: Sprint Planning**
```
1. Create Sprint
   POST /api/agile/projects/1/sprints/
   - Name: "Sprint 2: Data Scraping"
   - Duration: 2 weeks
   - Goal: "Build Instagram scraper module"

2. Create Issues
   POST /api/agile/projects/1/issues/
   - Issue 1: "Design scraper architecture" (8 pts)
   - Issue 2: "Implement Instagram API client" (13 pts)
   - Issue 3: "Add data validation" (5 pts)
   - Issue 4: "Write unit tests" (8 pts)

3. Assign Issues to Sprint
   POST /api/agile/issues/{id}/assign-sprint/
   - Assign all 4 issues to Sprint 2

4. Assign to Team Members
   PUT /api/agile/issues/{id}/
   - Issue 1 → John (Senior Dev)
   - Issue 2 → Sarah (Backend Dev)
   - Issue 3 → Mike (QA)
   - Issue 4 → Sarah (Backend Dev)

5. View Sprint Dashboard
   GET /api/agile/sprints/2/detail/
   - Total: 4 issues
   - Story points: 34
   - Team: 3 people
```

**Day 10: Mid-Sprint Check**
```
1. Check Current Sprint
   GET /api/agile/current-sprint/
   - Completed: 1 issue (25%)
   - In Progress: 2 issues (50%)
   - To Do: 1 issue (25%)
   - Days remaining: 4

2. Review Blockers
   GET /api/agile/blockers/?sprint_id=2
   - 1 blocker: "Waiting for Instagram API approval"
   - Assigned to: CTO
   - Days open: 3

3. Create Action Item
   POST /api/agile/blockers/
   - Escalate blocker to management
```

**Day 14: Sprint End**
```
1. End Sprint
   POST /api/agile/sprints/2/end/
   - Automatically creates retrospective

2. Review Results
   GET /api/agile/sprint-history/?project_id=1
   - Completed: 3 issues (75%)
   - Blocked: 1 issue (25%)
   - Velocity: 26 story points

3. Plan Next Sprint
   - Carry over blocked issue
   - Plan Sprint 3
```

### Example 2: Developer Working on an Issue

**Day 1: Start Sprint**
```
1. View Current Sprint
   GET /api/agile/current-sprint/
   - See assigned issues
   - Understand sprint goal

2. Start Issue
   PUT /api/agile/issues/5/
   - Status: "in_progress"
   - Comment: "Starting implementation"

3. Kanban Board
   - Drag MOBILE-5 to "In Progress" column
```

**Day 3: Mid-Work**
```
1. Hit a Blocker
   POST /api/agile/blockers/
   - Title: "Need clarification on auth flow"
   - Type: "Decision Needed"
   - Assigned to: Tech Lead

2. Continue Other Work
   - Start MOBILE-6 while waiting
   - Move to "In Progress"
```

**Day 5: Ready for Review**
```
1. Complete Issue
   PUT /api/agile/issues/5/
   - Status: "in_review"
   - Comment: "Ready for code review, PR: #123"

2. Kanban Board
   - Drag MOBILE-5 to "In Review" column
```

**Day 6: Approved**
```
1. Issue Approved
   PUT /api/agile/issues/5/
   - Status: "done"
   - Comment: "Merged to main"

2. Kanban Board
   - Drag MOBILE-5 to "Done" column
   - Sprint progress updates to 50%
```

### Example 3: Tracking Sprint Progress

**Real-time Dashboard**
```
Current Sprint: Sprint 1: Authentication
Project: Instagram Mobile App
Timeline: Jan 20 - Feb 3 (10 days remaining)

Progress:
┌─────────────────────────────────┐
│ Completed: 1/4 (25%)            │
│ In Progress: 1/4 (25%)          │
│ To Do: 2/4 (50%)                │
│ Velocity: 5 story points/day    │
└─────────────────────────────────┘

Issues:
✓ MOBILE-1: Design login screen [DONE]
⏳ MOBILE-2: Implement JWT auth [IN PROGRESS]
⏳ MOBILE-3: Setup database [IN PROGRESS]
⏸ MOBILE-4: Create API endpoints [TO DO]

Blockers:
🚫 MOBILE-3: Waiting for API docs (2 days)
   Assigned to: CTO
   Status: Active

Team:
👤 John Doe: 2 issues (1 done, 1 in progress)
👤 Sarah: 1 issue (in progress)
👤 Mike: 1 issue (to do)
```

---

## Quick Reference

### For Project Managers
- Create projects and sprints
- Assign issues to team members
- Track sprint progress
- Manage blockers
- Review retrospectives

### For Developers
- View assigned issues
- Move issues through workflow
- Update issue status
- Add comments
- Report blockers

### Key URLs
- Projects: `/projects`
- Project Detail: `/projects/{id}`
- Kanban Board: `/boards/{id}`
- Current Sprint: `/current-sprint`
- Sprint History: `/sprint-history`

### Key Metrics
- Sprint Velocity: Story points completed per sprint
- Completion Rate: % of issues completed
- Blocker Count: Active blockers
- Days Remaining: Time left in sprint
- Team Capacity: Issues per team member
