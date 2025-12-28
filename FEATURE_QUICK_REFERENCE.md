# Recall - Feature Quick Reference

## 🎯 All 20 Features - Quick Access Guide

### 📍 WHERE TO FIND EACH FEATURE

#### Dashboard (`/`)
- Memory Score Widget
- Decision Reminders (yellow alerts)
- Memory Gaps (red alerts)
- Forgotten Knowledge (orange alerts)
- Personalized Suggestions (blue cards)

#### Conversations (`/conversations/{id}`)
- **Reactions** (👍 Agree, 🤔 Unsure, 👎 Concern) - Below content
- **Complexity Warning** - Yellow banner at top
- **Crisis Mode** - 🚨 Button in sidebar
- **Close Conversation** - "Wrap Up & Close" button
- **Share Link** - 📤 Button in sidebar
- **Timeline** - "Show Full Timeline" button
- **Edit History** - "Show Me The History" button

#### Decisions (`/decisions/{id}`)
- **Confidence Indicator** - Score with High/Medium/Low
- **Decision Reminders** - Auto-generated, shown on dashboard

#### Knowledge (`/knowledge`)
- **Search** - Main search bar
- **FAQ Builder** - "View FAQ" button
- **Before You Ask** - Auto-suggests when typing
- **Time-Based Memory** - Sidebar buttons (Month/Quarter/Year)
- **Cultural Memory** - 📖 Section with "Add Memory" button
- **Legacy Archive** - 🏛️ Historical content section
- **Trending Topics** - Sidebar widget
- **Memory Gaps** - Shown on dashboard

#### Settings (`/settings`)
- **Quiet Mode** - Toggle + mute topics/types
- **Badges** - Display earned badges
- **Offline Mode** - Performance toggle
- **Low Data Mode** - Performance toggle

#### Personal Reflection (`/reflection`)
- **Activity Summary** - Last 90 days
- **Top Topics** - Your most active areas
- **Insights** - Personalized feedback

---

## 🔧 BACKEND ENDPOINTS

### Conversations
```
GET    /api/conversations/
POST   /api/conversations/
GET    /api/conversations/{id}/
PUT    /api/conversations/{id}/
DELETE /api/conversations/{id}/

POST   /api/conversations/{id}/reactions/add/
DELETE /api/conversations/{id}/reactions/remove/
GET    /api/conversations/{id}/reactions/

POST   /api/conversations/{id}/complexity/
GET    /api/conversations/{id}/timeline/
POST   /api/conversations/{id}/close/
POST   /api/conversations/{id}/crisis/
POST   /api/conversations/{id}/share/

GET    /api/conversations/preferences/
PUT    /api/conversations/preferences/
GET    /api/conversations/badges/
```

### Decisions
```
GET    /api/decisions/
POST   /api/decisions/
GET    /api/decisions/{id}/
POST   /api/decisions/{id}/approve/
POST   /api/decisions/{id}/implement/
GET    /api/decisions/reminders/
POST   /api/decisions/{id}/reminded/
POST   /api/decisions/convert/{conversation_id}/
```

### Knowledge
```
POST   /api/knowledge/search/
GET    /api/knowledge/memory-score/
GET    /api/knowledge/memory-gaps/
GET    /api/knowledge/forgotten/
GET    /api/knowledge/suggestions/
POST   /api/knowledge/before-you-ask/
GET    /api/knowledge/faq/
POST   /api/knowledge/time-comparison/
GET    /api/knowledge/cultural-memory/
POST   /api/knowledge/cultural-memory/
GET    /api/knowledge/legacy/
GET    /api/knowledge/reflection/
```

---

## 💡 FEATURE USAGE PATTERNS

### For New Team Members
1. Check **Complexity Warning** on conversations
2. Use **"Before You Ask"** before posting questions
3. View **FAQ** for common answers
4. Check **Onboarding Package** (`/onboarding`)

### For Contributors
1. Add **Reactions** to show agreement/concern
2. Use **Quiet Mode** to filter noise
3. Check **"What Should I Read?"** for relevant content
4. View **Personal Reflection** to track impact

### For Managers
1. Monitor **Memory Score** on dashboard
2. Review **Decision Reminders** daily
3. Check **Memory Gaps** for missing decisions
4. Use **Decision Confidence** to assess support

### For Admins
1. Review **Forgotten Knowledge** alerts
2. Add **Cultural Memories** for history
3. Check **Legacy Archive** for old content
4. Monitor **Time-Based Memory** for trends

---

## 🎨 UI COMPONENTS

### Buttons
- **Primary**: Black background, white text
- **Secondary**: White background, black border
- **Crisis**: Red background/border
- **Success**: Green background
- **Warning**: Yellow background

### Alerts
- **Yellow**: Reminders, complexity warnings
- **Red**: Memory gaps, critical issues
- **Orange**: Forgotten knowledge
- **Blue**: Suggestions, info
- **Purple**: Cultural memory
- **Gray**: Legacy content

### Badges
- 🏆 Decision Owner
- 📚 Context Contributor
- 🧠 Knowledge Builder
- 🚨 Crisis Responder

---

## 🔑 KEYBOARD SHORTCUTS

(If implemented in useKeyboardShortcuts.js)
- `Cmd/Ctrl + K` - Command palette
- `Cmd/Ctrl + /` - Search
- `Cmd/Ctrl + N` - New conversation

---

## 📊 METRICS & SCORING

### Memory Score (0-100)
- **Decision Clarity** (30%): Approved decisions / total
- **AI Coverage** (25%): AI processed / total conversations
- **Implementation Rate** (25%): Implemented / approved decisions
- **Activity Score** (20%): Recent activity (10 items/week = 100%)

### Decision Confidence (0-100)
- **Reactions** (40%): Agree votes / total reactions
- **Discussion** (30%): Reply count (max 30 points)
- **Participation** (30%): Total reactions (max 30 points)

### Complexity Score (0-100)
- Acronyms found
- Jargon detected
- Assumptions made
- Context missing

---

## 🚀 QUICK START COMMANDS

### Backend
```bash
# Start Redis
start-redis.bat

# Start Django
start-backend.bat

# Start Celery
start-celery.bat

# Start Celery Beat (for reminders)
start-celery-beat.bat
```

### Frontend
```bash
# Start React
start-frontend.bat

# Or from frontend directory
npm start
```

### Database
```bash
# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Setup organization
python manage.py setup_org --org-name "Company" --org-slug "company" --admin-username "admin" --admin-password "password"
```

---

## 🐛 TROUBLESHOOTING

### Feature Not Working?
1. Check backend is running (`http://localhost:8000`)
2. Check frontend is running (`http://localhost:3000`)
3. Check Redis is running (for AI features)
4. Check Celery is running (for async tasks)
5. Check migrations are applied

### No AI Processing?
- Ensure Redis is running
- Ensure Celery worker is running
- Check `ANTHROPIC_API_KEY` in `.env`

### No Reminders?
- Ensure Celery Beat is running
- Check `start-celery-beat.bat`

### Badges Not Appearing?
- Check if action was completed (close conversation, mark crisis)
- Refresh page
- Check `/settings` page

---

## 📚 DOCUMENTATION

- **README.md** - Project overview
- **STARTUP_GUIDE.md** - Detailed startup instructions
- **ALL_FEATURES_COMPLETE.md** - Complete feature documentation
- **ALL_PARTIALS_COMPLETE.md** - Previous implementation notes

---

## 🎯 FEATURE PRIORITY

### Must-Have (Core)
1. Conversations & Replies
2. Decisions
3. Search
4. AI Processing

### High Value (Intelligence)
5. Memory Score
6. Decision Confidence
7. Memory Gaps
8. Forgotten Knowledge
9. Personalized Suggestions

### User Experience (UX)
10. Reactions
11. Complexity Check
12. Timeline
13. Close Conversation
14. Crisis Mode
15. Quiet Mode

### Nice-to-Have (Extra)
16. Badges
17. Cultural Memory
18. Legacy Archive
19. Personal Reflection
20. Share Links

---

## 🔐 SECURITY NOTES

- JWT authentication required for all endpoints
- Organization isolation enforced
- User can only edit/delete own content
- Admin/Manager roles for approvals
- CSRF protection enabled

---

## 🌟 BEST PRACTICES

### Creating Conversations
- Use clear, descriptive titles
- Add "Why This Matters" context
- Choose appropriate post type
- Set priority level
- Use @mentions for relevant people

### Making Decisions
- Document rationale clearly
- Set impact level appropriately
- Enable reminders for follow-up
- Convert from conversations when ready

### Using Search
- Use natural language queries
- Check "Before You Ask" suggestions
- Review FAQ before posting questions
- Use filters to narrow results

### Managing Preferences
- Enable Quiet Mode to reduce noise
- Mute topics you're not involved in
- Use Low Data Mode on slow connections
- Check Personal Reflection monthly

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Production Ready ✅
