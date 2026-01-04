# Agile System - Quick Reference Cheat Sheet

## Project Manager Checklist

### Sprint Planning (Day 1)
- [ ] Create Sprint with name, dates, goal
- [ ] Create Issues for sprint
- [ ] Assign issues to team members
- [ ] Set story points for each issue
- [ ] Assign issues to sprint

### Daily Standup
- [ ] Check Current Sprint dashboard
- [ ] Review blockers
- [ ] Check issue progress
- [ ] Update team on blockers

### Sprint Review (Day 14)
- [ ] Review completed issues
- [ ] Discuss blockers
- [ ] Collect team feedback
- [ ] End sprint
- [ ] Plan next sprint

---

## Developer Checklist

### Daily Workflow
- [ ] Check assigned issues
- [ ] Move issue to "In Progress"
- [ ] Work on issue
- [ ] Add comments/updates
- [ ] Move to "In Review" when ready
- [ ] Move to "Done" when approved

### When Blocked
- [ ] Create blocker with clear description
- [ ] Assign to responsible person
- [ ] Continue with other issues
- [ ] Check blocker status daily

### Sprint End
- [ ] Complete all assigned issues
- [ ] Participate in retrospective
- [ ] Provide feedback
- [ ] Prepare for next sprint

---

## Common Tasks

### Create a Project
```
1. Dashboard → Projects → Create
2. Enter name, key, description
3. Click Create
✓ Board and columns auto-created
```

### Create a Sprint
```
1. Project Detail → Sprints → Create
2. Enter name, start date, end date, goal
3. Click Create
```

### Create an Issue
```
1. Kanban Board → Click "+" in column
2. Enter title, priority
3. Click Create
✓ Issue gets auto ID (e.g., MOBILE-1)
```

### Assign Issue to Sprint
```
1. Issue Detail → Sprint dropdown
2. Select sprint
3. Click Save
```

### Move Issue Between Columns
```
1. Kanban Board
2. Drag issue card to new column
✓ Status updates automatically
```

### Report a Blocker
```
1. Current Sprint → Blockers → Create
2. Enter title, type, description
3. Assign to team member
4. Click Create
```

### Resolve a Blocker
```
1. Blockers list
2. Click blocker
3. Click "Resolve"
✓ Status changes to resolved
```

### End a Sprint
```
1. Sprint Detail
2. Click "End Sprint"
✓ Retrospective auto-created
```

---

## Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| TO DO | Not started | Assign and start |
| IN PROGRESS | Currently working | Keep updating |
| IN REVIEW | Ready for review | Wait for approval |
| DONE | Completed | Move to next issue |

---

## Priority Levels

| Priority | Meaning | Timeline |
|----------|---------|----------|
| LOWEST | Nice to have | After everything else |
| LOW | Can wait | Next sprint |
| MEDIUM | Important | This sprint |
| HIGH | Very important | This week |
| HIGHEST | Critical | Today |

---

## Story Points Guide

| Points | Complexity | Time |
|--------|-----------|------|
| 1 | Trivial | < 1 hour |
| 2 | Simple | 1-2 hours |
| 3 | Easy | 2-4 hours |
| 5 | Medium | 4-8 hours |
| 8 | Complex | 1-2 days |
| 13 | Very complex | 2-3 days |

---

## Blocker Types

| Type | Example | Resolution |
|------|---------|-----------|
| TECHNICAL | Bug in dependency | Fix or workaround |
| DEPENDENCY | Waiting for API | Follow up with team |
| DECISION | Need approval | Escalate to manager |
| RESOURCE | Need person/tool | Request from manager |
| EXTERNAL | Third-party issue | Contact vendor |

---

## Key Metrics

**Sprint Velocity**
- Story points completed per sprint
- Use to plan future sprints
- Target: Consistent velocity

**Completion Rate**
- % of issues completed
- Target: 80-90% per sprint
- 10-20% buffer for blockers

**Blocker Count**
- Active blockers per sprint
- Target: < 2 active blockers
- Escalate if > 3

**Days Remaining**
- Time left in sprint
- Plan accordingly
- Don't start new issues in last 2 days

---

## Troubleshooting

### Issue not appearing in sprint
- Check if issue is assigned to sprint
- Verify sprint dates are correct
- Refresh page

### Can't move issue between columns
- Check if you have permission
- Verify issue is in correct board
- Try refreshing

### Blocker not showing
- Check if blocker is assigned to sprint
- Verify blocker status is "active"
- Check sprint filter

### Sprint not ending
- Verify all issues are completed or moved
- Check sprint end date
- Contact admin if issue persists

---

## Tips & Tricks

### For Project Managers
- Use story points to estimate capacity
- Plan 20% buffer for unexpected work
- Review blockers daily
- Track velocity over time

### For Developers
- Break down large issues into smaller ones
- Update issue status frequently
- Comment on progress
- Report blockers early

### For Everyone
- Use clear, descriptive titles
- Add comments for context
- Keep sprint goals focused
- Celebrate completed sprints

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Drag issue | Move between columns |
| Click issue | Open detail panel |
| Esc | Close detail panel |
| Enter | Submit comment |

---

## Support

For issues or questions:
1. Check documentation
2. Ask team lead
3. Contact admin
4. Create support ticket

---

## Glossary

- **Project**: Container for all work
- **Sprint**: 2-week iteration
- **Issue**: Individual task
- **Blocker**: Something blocking progress
- **Story Points**: Complexity estimate
- **Velocity**: Points completed per sprint
- **Retrospective**: Sprint review meeting
- **Kanban**: Visual workflow board
