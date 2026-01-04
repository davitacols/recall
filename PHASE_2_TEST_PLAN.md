# Phase 2 Testing Checklist

## 1. DRAG-DROP KANBAN BOARD

### Setup
- [ ] Navigate to `/projects/1` (Mobile App project)
- [ ] Click on "Mobile Development" board
- [ ] Should see 4 columns: To Do, In Progress, In Review, Done
- [ ] Should see 4 issues in "To Do" column

### Test Cases

#### Test 1.1: Drag Issue to In Progress
- [ ] Drag "Design login screen" from To Do to In Progress
- [ ] Issue should move visually
- [ ] Column counts should update (To Do: 3, In Progress: 1)
- [ ] Refresh page - issue should stay in In Progress
- [ ] Check database: `Issue.objects.get(key='MOBILE-1').status` should be 'in_progress'

#### Test 1.2: Drag Issue to Done
- [ ] Drag "Implement JWT auth" from To Do to Done
- [ ] Issue should move visually
- [ ] Status should update to 'done'
- [ ] Refresh page - issue should stay in Done

#### Test 1.3: Drag Back to To Do
- [ ] Drag an issue from Done back to To Do
- [ ] Should work smoothly
- [ ] Status should revert to 'todo'

#### Test 1.4: Visual Feedback
- [ ] Hover over issue - should lift up slightly
- [ ] Drag over column - column should highlight
- [ ] Drop zone should show visual feedback

---

## 2. SEARCH FUNCTIONALITY

### Setup
- [ ] Look for search component in header (if integrated)
- [ ] Or test via API: `GET /api/conversations/?search=authentication`

### Test Cases

#### Test 2.1: Search Conversations
- [ ] Type "authentication" in search
- [ ] Should show "Authentication Strategy Discussion" conversation
- [ ] Click result - should navigate to conversation detail

#### Test 2.2: Search Decisions
- [ ] Type "jwt" in search
- [ ] Should show "Use JWT for Authentication" decision
- [ ] Click result - should navigate to decision detail

#### Test 2.3: Search Issues
- [ ] Type "login" in search
- [ ] Should show "Design login screen" issue
- [ ] Results should show issue key and status

#### Test 2.4: No Results
- [ ] Type "xyz123" (non-existent)
- [ ] Should show "No results found"

#### Test 2.5: Minimum Characters
- [ ] Type "a" (1 character)
- [ ] Should not show results
- [ ] Type "au" (2 characters)
- [ ] Should show results

---

## 3. BURNDOWN CHART

### Setup
- [ ] Navigate to `/sprint` (Current Sprint page)
- [ ] Should see "Sprint 1: Authentication" sprint
- [ ] Click "View Kanban Board" or navigate to sprint detail

### Test Cases

#### Test 3.1: Chart Displays
- [ ] Burndown chart should render
- [ ] Should show ideal line (diagonal)
- [ ] Should show actual progress point
- [ ] Should show completion percentage

#### Test 3.2: Stats Display
- [ ] Completion: Should show 25% (1 of 4 issues done)
- [ ] Remaining: Should show 3
- [ ] Days Left: Should show ~14 days
- [ ] Status: Should show "Behind" (since we only completed 1 of 4)

#### Test 3.3: Update After Drag
- [ ] Go to kanban board
- [ ] Drag another issue to Done (now 2 of 4)
- [ ] Go back to sprint detail
- [ ] Burndown should update to 50% completion
- [ ] Status might change to "On Track"

#### Test 3.4: Chart Accuracy
- [ ] Total issues: 4
- [ ] Completed: 2 (after test 3.3)
- [ ] Remaining: 2
- [ ] Completion %: 50%

---

## MANUAL TESTING STEPS

### Step 1: Test Kanban
```
1. Go to http://localhost:3000/projects/1
2. Click "Mobile Development" board
3. Drag "Design login screen" to "In Progress"
4. Verify it moves
5. Refresh page
6. Verify it stayed in "In Progress"
```

### Step 2: Test Search
```
1. Look for search box in header
2. Type "authentication"
3. Should see conversation result
4. Click it
5. Should navigate to conversation detail
```

### Step 3: Test Burndown
```
1. Go to http://localhost:3000/sprint
2. Scroll down to see burndown chart
3. Should show 25% completion (1 of 4 done)
4. Go back to kanban
5. Drag another issue to Done
6. Go back to sprint
7. Burndown should show 50% completion
```

---

## DATABASE VERIFICATION

### After Kanban Test
```python
from apps.agile.models import Issue
issue = Issue.objects.get(key='MOBILE-1')
print(f"Status: {issue.status}")  # Should be 'in_progress'
print(f"Column: {issue.column.name}")  # Should be 'In Progress'
```

### After Burndown Test
```python
from apps.agile.models import Sprint
sprint = Sprint.objects.get(name='Sprint 1: Authentication')
print(f"Total issues: {sprint.issues.count()}")  # Should be 4
print(f"Done: {sprint.issues.filter(status='done').count()}")  # Should be 2
print(f"Completion: {(2/4)*100}%")  # Should be 50%
```

---

## EXPECTED RESULTS

### Kanban Board
- ✅ Issues drag smoothly between columns
- ✅ Status updates in database
- ✅ Changes persist after refresh
- ✅ Visual feedback works

### Search
- ✅ Results appear as you type (2+ chars)
- ✅ Results grouped by type
- ✅ Navigation works
- ✅ No results message shows

### Burndown Chart
- ✅ Chart renders correctly
- ✅ Completion % updates
- ✅ Days remaining calculated
- ✅ Status indicator works
- ✅ Updates after issue status changes

---

## ISSUES TO WATCH FOR

1. **Kanban not updating**: Check if API endpoint is being called
2. **Search not showing**: Verify search component is integrated in header
3. **Burndown not updating**: May need to refresh page after kanban changes
4. **Drag not working**: Check browser console for errors

---

## SIGN-OFF

Once all tests pass:
- [ ] Kanban board fully functional
- [ ] Search working end-to-end
- [ ] Burndown chart accurate
- [ ] Ready for Phase 2 completion
