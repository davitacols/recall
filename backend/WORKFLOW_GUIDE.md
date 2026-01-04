# Complete Workflow Guide: From Project Creation to Sprint Management

## Step-by-Step Flow

### STEP 1: Create a New Project

**Location:** Dashboard → Projects → Create Project

```
┌─────────────────────────────────────────┐
│ Create New Project                      │
├─────────────────────────────────────────┤
│                                         │
│ Project Name: "Mobile App"              │
│ Project Key: "MOBILE"                   │
│ Description: "iOS and Android app"      │
│ Lead: Select team member                │
│                                         │
│ [Cancel]  [Create Project]              │
└─────────────────────────────────────────┘
```

**What happens:**
- ✓ Project created with key "MOBILE"
- ✓ Default Kanban board auto-created
- ✓ Columns auto-created: To Do, In Progress, In Review, Done
- ✓ You're redirected to Project Detail page

**Result:**
```
Project: Mobile App (MOBILE)
├── Board: Backlog
│   ├── Column: To Do (0 issues)
│   ├── Column: In Progress (0 issues)
│   ├── Column: In Review (0 issues)
│   └── Column: Done (0 issues)
└── Sprints: 0
```

---

### STEP 2: Create Your First Sprint

**Location:** Project Detail → Sprints → Create Sprint

```
┌─────────────────────────────────────────┐
│ Create Sprint                           │
├─────────────────────────────────────────┤
│                                         │
│ Sprint Name: "Sprint 1: Auth"           │
│ Start Date: Jan 20, 2025                │
│ End Date: Feb 3, 2025                   │
│ Goal: "Implement user authentication"   │
│                                         │
│ [Cancel]  [Create Sprint]               │
└─────────────────────────────────────────┘
```

**What happens:**
- ✓ Sprint created with 2-week duration
- ✓ Sprint linked to project
- ✓ Sprint appears in project's sprint list

**Result:**
```
Project: Mobile App (MOBILE)
├── Board: Backlog
│   ├── Column: To Do (0 issues)
│   ├── Column: In Progress (0 issues)
│   ├── Column: In Review (0 issues)
│   └── Column: Done (0 issues)
└── Sprints: 1
    └── Sprint 1: Auth (Jan 20 - Feb 3)
        ├── Issues: 0
        ├── Goal: "Implement user authentication"
        └── Status: Active
```

---

### STEP 3: Create Issues for the Sprint

**Location:** Kanban Board → Click "+" in "To Do" column

```
┌─────────────────────────────────────────┐
│ Create New Issue                        │
├─────────────────────────────────────────┤
│                                         │
│ Title: "Design login screen"            │
│ Priority: High                          │
│ Story Points: 5                         │
│ Assignee: John Doe                      │
│                                         │
│ [Cancel]  [Create]                      │
└─────────────────────────────────────────┘
```

**Create 4 issues:**
1. "Design login screen" (5 pts) → John
2. "Implement JWT auth" (8 pts) → Sarah
3. "Setup database" (5 pts) → Mike
4. "Create API endpoints" (8 pts) → Sarah

**What happens:**
- ✓ Issues created with auto-generated keys (MOBILE-1, MOBILE-2, etc.)
- ✓ Issues appear in "To Do" column
- ✓ Issues assigned to team members

**Result:**
```
Kanban Board: Backlog

To Do (4)              In Progress (0)    In Review (0)      Done (0)
├─ MOBILE-1           
│  Design login       
│  5 pts, John        
│
├─ MOBILE-2           
│  Implement JWT      
│  8 pts, Sarah       
│
├─ MOBILE-3           
│  Setup database     
│  5 pts, Mike        
│
└─ MOBILE-4           
   Create API         
   8 pts, Sarah       
```

---

### STEP 4: Assign Issues to Sprint

**Location:** Issue Detail Panel → Sprint Dropdown

```
For each issue:
1. Click issue card
2. Select Sprint: "Sprint 1: Auth"
3. Click Save
```

**What happens:**
- ✓ Issues linked to sprint
- ✓ Sprint now tracks these issues
- ✓ Issues appear in sprint progress

**Result:**
```
Sprint 1: Auth (Jan 20 - Feb 3)
├── Total Issues: 4
├── Story Points: 26
├── Issues:
│   ├─ MOBILE-1: Design login (5 pts) - John
│   ├─ MOBILE-2: Implement JWT (8 pts) - Sarah
│   ├─ MOBILE-3: Setup database (5 pts) - Mike
│   └─ MOBILE-4: Create API (8 pts) - Sarah
└── Status: Active
```

---

### STEP 5: Start Working (Move Issues)

**Location:** Kanban Board → Drag issues between columns

**Day 1:**
```
John starts: MOBILE-1 → In Progress
Sarah starts: MOBILE-2 → In Progress
Mike starts: MOBILE-3 → In Progress

Kanban Board:
To Do (1)              In Progress (3)    In Review (0)      Done (0)
├─ MOBILE-4           ├─ MOBILE-1        
   Create API         │  Design login    
   8 pts, Sarah       │  5 pts, John     
                      │
                      ├─ MOBILE-2        
                      │  Implement JWT   
                      │  8 pts, Sarah    
                      │
                      └─ MOBILE-3        
                         Setup database  
                         5 pts, Mike     
```

**Day 3:**
```
John finishes: MOBILE-1 → In Review
Sarah finishes: MOBILE-2 → In Review

Kanban Board:
To Do (1)              In Progress (1)    In Review (2)      Done (0)
├─ MOBILE-4           ├─ MOBILE-3        ├─ MOBILE-1        
   Create API         │  Setup database  │  Design login    
   8 pts, Sarah       │  5 pts, Mike     │  5 pts, John     
                      │                  │
                      │                  └─ MOBILE-2        
                      │                     Implement JWT   
                      │                     8 pts, Sarah    
```

**Day 5:**
```
John's review approved: MOBILE-1 → Done
Sarah's review approved: MOBILE-2 → Done
Mike finishes: MOBILE-3 → In Review

Kanban Board:
To Do (1)              In Progress (0)    In Review (1)      Done (2)
├─ MOBILE-4           
   Create API         
   8 pts, Sarah       
                                         ├─ MOBILE-3        ├─ MOBILE-1
                                         │  Setup database  │  Design login
                                         │  5 pts, Mike     │  5 pts, John
                                         │                  │
                                         │                  └─ MOBILE-2
                                         │                     Implement JWT
                                         │                     8 pts, Sarah
```

---

### STEP 6: Monitor Sprint Progress

**Location:** Current Sprint Dashboard

```
Sprint 1: Auth (Jan 20 - Feb 3)
Mobile App • 10 days remaining

Progress: 50% ████████░░

Completed: 2/4 issues
In Progress: 0/4 issues
To Do: 1/4 issues

Active Blockers: 1
├─ Waiting for API documentation (2 days open)
└─ [Report Blocker]

Sprint Info:
├─ Total Issues: 4
├─ Decisions Made: 0
└─ [View Kanban Board]
```

---

### STEP 7: Report a Blocker

**Location:** Current Sprint → Report Blocker

```
┌─────────────────────────────────────────┐
│ Report Blocker                          │
├─────────────────────────────────────────┤
│                                         │
│ Title: "Waiting for API documentation"  │
│ Type: Dependency                        │
│ Description: "Can't proceed with auth   │
│              without API specs"         │
│                                         │
│ [Cancel]  [Report Blocker]              │
└─────────────────────────────────────────┘
```

**What happens:**
- ✓ Blocker created and linked to sprint
- ✓ Blocker appears in Current Sprint dashboard
- ✓ Team is notified

**Result:**
```
Sprint 1: Auth
├── Active Blockers: 1
│   └─ Waiting for API documentation
│      Type: Dependency
│      Days Open: 2
│      Assigned to: CTO
└── Status: Active
```

---

### STEP 8: End Sprint & Review

**Location:** Sprint Detail → End Sprint

```
┌─────────────────────────────────────────┐
│ End Sprint?                             │
├─────────────────────────────────────────┤
│                                         │
│ This will mark "Sprint 1: Auth" as      │
│ complete and generate a retrospective.  │
│                                         │
│ ✓ Sprint updates preserved              │
│ ✓ Blockers remain visible               │
│ ✓ AI summary generated                  │
│                                         │
│ [Cancel]  [End Sprint]                  │
└─────────────────────────────────────────┘
```

**What happens:**
- ✓ Sprint marked as completed
- ✓ Retrospective auto-created
- ✓ Sprint appears in Sprint History
- ✓ Metrics captured for future reference

**Result:**
```
Sprint History:
├── Sprint 1: Auth (Jan 6 - Jan 19)
│   ├── Status: Completed
│   ├── Completed: 3/4 (75%)
│   ├── Blocked: 1
│   ├── Decisions: 0
│   └── [View Details]
│
└── Sprint 2: Data Scraping (Jan 20 - Feb 3)
    ├── Status: Active
    ├── Completed: 2/4 (50%)
    ├── Blocked: 1
    ├── Decisions: 0
    └── [View Details]
```

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CREATE PROJECT                           │
│  "Mobile App" (MOBILE)                                      │
│  ✓ Board auto-created                                       │
│  ✓ Columns auto-created                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    CREATE SPRINT                            │
│  "Sprint 1: Auth" (Jan 20 - Feb 3)                          │
│  ✓ Linked to project                                        │
│  ✓ Goal defined                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    CREATE ISSUES                            │
│  MOBILE-1: Design login (5 pts)                             │
│  MOBILE-2: Implement JWT (8 pts)                            │
│  MOBILE-3: Setup database (5 pts)                           │
│  MOBILE-4: Create API (8 pts)                               │
│  ✓ Issues in "To Do" column                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  ASSIGN TO SPRINT                           │
│  All 4 issues → Sprint 1: Auth                              │
│  ✓ Sprint tracks issues                                     │
│  ✓ Progress visible                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   WORK ON ISSUES                            │
│  To Do → In Progress → In Review → Done                     │
│  ✓ Team moves issues                                        │
│  ✓ Progress updates                                         │
│  ✓ Blockers reported                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  MONITOR PROGRESS                           │
│  Current Sprint Dashboard:                                  │
│  ✓ Completion %                                             │
│  ✓ Issue stats                                              │
│  ✓ Active blockers                                          │
│  ✓ Team updates                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    END SPRINT                               │
│  ✓ Mark as completed                                        │
│  ✓ Generate retrospective                                   │
│  ✓ Capture metrics                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  SPRINT HISTORY                             │
│  ✓ View past sprints                                        │
│  ✓ Review metrics                                           │
│  ✓ Plan next sprint                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Metrics at Each Stage

### After Project Creation
```
Project: Mobile App
├── Boards: 1
├── Sprints: 0
├── Issues: 0
└── Team: 0
```

### After Sprint Creation
```
Sprint 1: Auth
├── Status: Active
├── Duration: 14 days
├── Issues: 0
├── Goal: "Implement user authentication"
└── Progress: 0%
```

### After Creating Issues
```
Sprint 1: Auth
├── Status: Active
├── Total Issues: 4
├── Story Points: 26
├── Completed: 0 (0%)
├── In Progress: 0 (0%)
├── To Do: 4 (100%)
└── Progress: 0%
```

### Mid-Sprint (Day 5)
```
Sprint 1: Auth
├── Status: Active
├── Days Remaining: 9
├── Total Issues: 4
├── Completed: 2 (50%)
├── In Progress: 0 (0%)
├── To Do: 1 (25%)
├── Blocked: 1
└── Progress: 50%
```

### Sprint End
```
Sprint 1: Auth
├── Status: Completed
├── Total Issues: 4
├── Completed: 3 (75%)
├── Blocked: 1 (25%)
├── Decisions: 0
├── Velocity: 21 story points
└── Retrospective: Generated
```

---

## Quick Reference: What Happens at Each Step

| Step | Action | Auto-Created | Result |
|------|--------|--------------|--------|
| 1 | Create Project | Board + Columns | Project ready |
| 2 | Create Sprint | - | Sprint linked to project |
| 3 | Create Issues | Issue keys (MOBILE-1, etc.) | Issues in To Do |
| 4 | Assign to Sprint | - | Sprint tracks issues |
| 5 | Move Issues | - | Progress updates |
| 6 | Report Blocker | - | Blocker visible |
| 7 | Monitor Progress | - | Dashboard updates |
| 8 | End Sprint | Retrospective | Sprint archived |

---

## Common Questions

**Q: What if I create an issue without assigning it to a sprint?**
A: The issue still exists in the project and appears on the Kanban board, but won't be tracked in sprint progress.

**Q: Can I move issues between sprints?**
A: Yes, use the Issue Detail panel to change the sprint assignment.

**Q: What happens to incomplete issues when sprint ends?**
A: They remain in the project. You can move them to the next sprint or leave them unassigned.

**Q: Can I create multiple sprints at once?**
A: Yes, create as many sprints as needed. Only one can be "active" at a time.

**Q: How do I track team velocity?**
A: Sprint History shows completed story points per sprint. Use this to plan future sprints.

---

## Next Steps

1. **Create your first project** → Go to Projects → Create Project
2. **Plan your first sprint** → Project Detail → Create Sprint
3. **Add team members** → Project Detail → Team section
4. **Create issues** → Kanban Board → Click "+" in column
5. **Start working** → Drag issues to In Progress
6. **Monitor progress** → Current Sprint Dashboard
7. **End sprint** → Sprint Detail → End Sprint
8. **Review history** → Sprint History
