# Recall - Complete Testing Checklist

## ✅ Authentication & Users

### Registration
- [ ] Go to `/login`
- [ ] Click "Register" tab
- [ ] Fill: Email, Username, Password, Organization
- [ ] Click "Create Account"
- [ ] Should show success message

### Login
- [ ] Enter credentials
- [ ] Click "Sign In"
- [ ] Should redirect to dashboard
- [ ] Check console for `[AUTH] Login successful`

### Profile
- [ ] Check username displays correctly (not email)
- [ ] Check organization name shows

## ✅ Dashboard

### Layout
- [ ] Getty-style masonry grid
- [ ] Stats bar (conversations, decisions, actions)
- [ ] Activity cards with images
- [ ] Hover effects work

### Navigation
- [ ] Click on conversation card → Opens detail page
- [ ] Click on decision card → Opens decisions page
- [ ] All cards are clickable

## ✅ Conversations

### Create Conversation
- [ ] Click "Create" button
- [ ] Select type (Update/Question/Decision/Proposal)
- [ ] Enter title (min 5 chars)
- [ ] Enter content (min 10 chars)
- [ ] Type `@` → Shows user autocomplete
- [ ] Select user → Inserts full name
- [ ] Type `#` → Shows tag autocomplete
- [ ] Select tag → Inserts tag
- [ ] Click "Create Conversation"
- [ ] Should appear in list

### View Conversations
- [ ] Masonry grid view works
- [ ] List view toggle works
- [ ] Images display correctly
- [ ] Hover effects work
- [ ] Click conversation → Opens detail

### Conversation Detail
- [ ] Title displays
- [ ] Content displays with highlighted @mentions (blue)
- [ ] Content displays with highlighted #tags (black, clickable)
- [ ] Author info shows
- [ ] AI summary shows (if Redis running)
- [ ] Reply count shows

### Replies
- [ ] Type reply with @mentions
- [ ] Submit reply
- [ ] Reply appears in list
- [ ] Reply count increments

## ✅ Decisions

### View Decisions
- [ ] Masonry grid layout
- [ ] Status filters work (proposed, approved, etc.)
- [ ] Color coding by status
- [ ] Click decision → Shows details

### Create Decision (Manager/Admin only)
- [ ] Create decision
- [ ] Should appear in list
- [ ] Should appear in Activity Feed

## ✅ Knowledge Search

### Search
- [ ] Go to Knowledge page
- [ ] Enter query (e.g., "database migration")
- [ ] Click "Search"
- [ ] Results display with relevance scores
- [ ] Results show conversations and decisions
- [ ] Click result → Opens detail

### Trending Topics
- [ ] Shows recent keywords
- [ ] Click topic → Filters results

### Recent Decisions
- [ ] Shows approved decisions
- [ ] Click decision → Opens detail

## ✅ Activity Feed

### View Activity
- [ ] Go to Activity page
- [ ] Stats bar shows (today, week, all time)
- [ ] Masonry grid of activities
- [ ] Each card shows:
  - [ ] Colored image
  - [ ] Action type badge
  - [ ] Actor name and role
  - [ ] Content title
  - [ ] Relative timestamp

### Interactions
- [ ] Click activity card → Navigates to content
- [ ] Hover effects work
- [ ] Images zoom on hover

## ✅ Mentions & Tags

### @Mentions
- [ ] Type `@` in conversation/reply
- [ ] Autocomplete shows users
- [ ] Shows full name (not email)
- [ ] Select user → Inserts `@Full Name`
- [ ] Displayed mentions are blue and bold
- [ ] Mentions work in conversations and replies

### #Tags
- [ ] Type `#` in conversation
- [ ] Autocomplete shows existing tags
- [ ] Select tag → Inserts `#tagname`
- [ ] Create new tag by typing
- [ ] Displayed tags are black, bold, clickable
- [ ] Click tag → Filters conversations

## ✅ Keyboard Shortcuts

### Command Palette
- [ ] Press `⌘K` (Mac) or `Ctrl+K` (Windows)
- [ ] Command palette opens
- [ ] Type to search commands
- [ ] Arrow keys navigate
- [ ] Enter selects
- [ ] ESC closes

### Navigation Shortcuts
- [ ] `⌘1` → Dashboard
- [ ] `⌘2` → Conversations
- [ ] `⌘3` → Decisions
- [ ] `⌘4` → Knowledge
- [ ] `⌘N` → New conversation
- [ ] `⌘/` → Show shortcuts help

## ✅ UI/UX - Getty Style

### Design Elements
- [ ] League Spartan font throughout
- [ ] 2px black borders on cards
- [ ] No rounded corners
- [ ] Uppercase labels
- [ ] Bold typography
- [ ] Black/white/gray color scheme
- [ ] Masonry grid layouts

### Interactions
- [ ] Hover effects on cards
- [ ] Image zoom on hover
- [ ] Smooth transitions
- [ ] Loading states show
- [ ] Error messages display

## ✅ Error Handling

### Network Errors
- [ ] Disconnect internet
- [ ] Try action
- [ ] Should show error message
- [ ] Reconnect → Should work

### Validation
- [ ] Try empty title → Shows error
- [ ] Try short content → Shows error
- [ ] Invalid credentials → Shows error

### 404 Pages
- [ ] Go to `/invalid-url`
- [ ] Should show 404 or redirect

## ✅ Performance

### Loading
- [ ] Dashboard loads < 2 seconds
- [ ] Conversations load < 2 seconds
- [ ] Search results < 1 second
- [ ] No console errors

### Responsiveness
- [ ] Works on desktop (1920x1080)
- [ ] Works on laptop (1366x768)
- [ ] Mobile view (optional)

## 🔧 Backend Testing

### API Endpoints
```bash
# Test authentication
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"password"}'

# Test conversations
curl http://localhost:8000/api/conversations/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test search
curl -X POST http://localhost:8000/api/knowledge/search/ \
  -H "Content-Type: application/json" \
  -d '{"query":"database"}'

# Test activity
curl http://localhost:8000/api/organizations/activity/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Database
```bash
# Check users
python manage.py shell -c "from apps.organizations.models import User; print(User.objects.count())"

# Check conversations
python manage.py shell -c "from apps.conversations.models import Conversation; print(Conversation.objects.count())"

# Check search index
python manage.py index_knowledge
```

## 📊 Test Results

### Summary
- Total Tests: ~80
- Passed: ___
- Failed: ___
- Skipped: ___

### Critical Issues
1. 
2. 
3. 

### Minor Issues
1. 
2. 
3. 

### Notes
- Redis: [ ] Running [ ] Not Running (AI features disabled)
- Celery: [ ] Running [ ] Not Running (AI features disabled)
- Database: [ ] SQLite [ ] PostgreSQL

## 🚀 Production Readiness

### Before Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] Redis configured
- [ ] PostgreSQL configured
- [ ] Environment variables set
- [ ] Static files collected
- [ ] SSL certificates configured
- [ ] Backup strategy in place

### Performance Targets
- [ ] Page load < 2s
- [ ] API response < 500ms
- [ ] Search < 1s
- [ ] 99% uptime

## 📝 Test Notes

Date: ___________
Tester: ___________
Environment: [ ] Development [ ] Staging [ ] Production

Additional Notes:
