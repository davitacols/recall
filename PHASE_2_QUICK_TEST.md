# Phase 2 Quick Test Verification

## KANBAN BOARD TEST

### Test 1: Verify Endpoint Exists
```bash
curl -X GET http://localhost:8000/api/agile/boards/1/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: Returns board with columns and issues

### Test 2: Move Issue
```bash
curl -X POST http://localhost:8000/api/agile/issues/1/move/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"column_id": 2}'
```
Expected: Returns {"message": "Issue moved"}

### Test 3: Verify Status Changed
```python
from apps.agile.models import Issue
issue = Issue.objects.get(id=1)
print(f"Status: {issue.status}")  # Should be 'in_progress'
print(f"Column: {issue.column.name}")  # Should be 'In Progress'
```

---

## SEARCH TEST

### Test 1: Search Conversations
```bash
curl -X GET "http://localhost:8000/api/conversations/?search=authentication" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: Returns conversations matching "authentication"

### Test 2: Search Decisions
```bash
curl -X GET "http://localhost:8000/api/decisions/?search=jwt" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: Returns decisions matching "jwt"

---

## BURNDOWN CHART TEST

### Test 1: Get Sprint Data
```bash
curl -X GET http://localhost:8000/api/agile/sprints/3/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: Returns sprint with issue_count, completed count

### Test 2: Verify Calculations
```python
from apps.agile.models import Sprint
sprint = Sprint.objects.get(id=3)
total = sprint.issues.count()
completed = sprint.issues.filter(status='done').count()
percentage = (completed / total) * 100
print(f"Total: {total}, Completed: {completed}, %: {percentage}")
```

---

## MANUAL BROWSER TESTS

### Kanban Board
1. Go to http://localhost:3000/projects/1
2. Click "Mobile Development" board
3. Try dragging "Design login screen" to "In Progress"
4. Verify it moves
5. Refresh page
6. Verify it stayed in "In Progress"

### Search
1. Look for search box in header
2. Type "authentication"
3. Should see conversation result
4. Click it
5. Should navigate to conversation

### Burndown
1. Go to http://localhost:3000/sprint
2. Scroll to see burndown chart
3. Should show 25% (1 of 4 done)
4. Go to kanban
5. Drag another issue to Done
6. Go back to sprint
7. Should show 50%

---

## QUICK CHECKLIST

- [ ] Kanban board loads
- [ ] Can drag issues between columns
- [ ] Status updates in database
- [ ] Changes persist after refresh
- [ ] Search component integrated
- [ ] Search returns results
- [ ] Burndown chart renders
- [ ] Burndown updates after changes

---

## TROUBLESHOOTING

### Kanban not working
- Check browser console for errors
- Verify `/api/agile/boards/{id}/` returns data
- Check if move_issue endpoint is called

### Search not showing
- Verify Search component is in Layout.js header
- Check if search API endpoints work
- Verify results are being returned

### Burndown not updating
- May need to refresh page after kanban changes
- Verify sprint data is being fetched
- Check if calculations are correct

---

## SIGN-OFF CRITERIA

All tests pass = Ready for Phase 2 completion ✅
