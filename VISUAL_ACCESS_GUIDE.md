# Developer Assistant - Visual Access Guide

## 🎯 Where to Find It

```
┌─────────────────────────────────────────────────────────┐
│  RECALL - Conversation Detail Page                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ← Back to Conversations                                │
│                                                         │
│  [UPDATE]  [OPEN]  Jan 15, 2024                        │
│                                                         │
│  Architecture: Microservices vs Monolith               │
│  ═══════════════════════════════════════               │
│                                                         │
│  👤 John Doe                                           │
│  Author                                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  CONTENT                                                │
│                                                         │
│  Team discussed whether to adopt microservices...       │
│  [Full conversation content here]                       │
│                                                         │
│  👍 Agree (3)  🤔 Unsure (1)  👎 Concern (0)          │
├─────────────────────────────────────────────────────────┤
│  REPLIES (5)                                            │
│                                                         │
│  💬 Reply 1...                                         │
│  💬 Reply 2...                                         │
│  💬 Reply 3...                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ADD COMMENT                                            │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Share your thoughts...                          │  │
│  └─────────────────────────────────────────────────┘  │
│  [Post Reply]                                           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ╔═══════════════════════════════════════════════╗    │
│  ║ DEVELOPER INSIGHTS                  [REFRESH] ║    │
│  ╠═══════════════════════════════════════════════╣    │
│  ║                                               ║    │
│  ║  ┌─────────────────────────────────────────┐ ║    │
│  ║  │ ANALYZE WITH DEVELOPER MODE             │ ║    │ ← CLICK HERE!
│  ║  └─────────────────────────────────────────┘ ║    │
│  ║  AI-powered analysis for developer          ║    │
│  ║  productivity                                ║    │
│  ║                                               ║    │
│  ╚═══════════════════════════════════════════════╝    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 📍 Exact Location

**Page:** Conversation Detail (`/conversations/{id}`)

**Position:** 
- Below conversation content ✓
- Below replies section ✓
- Below reply form ✓
- At the bottom of main content area ✓

**Scroll:** May need to scroll down to see it

## 🎬 What Happens When You Click

### Before Click
```
╔═══════════════════════════════════════╗
║ DEVELOPER INSIGHTS                    ║
╠═══════════════════════════════════════╣
║                                       ║
║  ┌─────────────────────────────────┐ ║
║  │ ANALYZE WITH DEVELOPER MODE     │ ║
║  └─────────────────────────────────┘ ║
║  AI-powered analysis for developer  ║
║  productivity                       ║
║                                       ║
╚═══════════════════════════════════════╝
```

### During Processing (2-5 seconds)
```
╔═══════════════════════════════════════╗
║ DEVELOPER INSIGHTS                    ║
╠═══════════════════════════════════════╣
║                                       ║
║  ┌─────────────────────────────────┐ ║
║  │ ANALYZING...                    │ ║
║  └─────────────────────────────────┘ ║
║  ⏳ Processing with AI...           ║
║                                       ║
╚═══════════════════════════════════════╝
```

### After Processing
```
╔═══════════════════════════════════════════════════╗
║ DEVELOPER INSIGHTS                      [REFRESH] ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║ SIMPLE SUMMARY                                    ║
║ ─────────────────────────────────────────────    ║
║ We're switching from MySQL to PostgreSQL         ║
║ because we need better support for complex        ║
║ queries. This will make our reports faster.       ║
║                                                   ║
║ ┌───────────────────────────────────────────┐   ║
║ │ TECHNICAL DECISION    [HIGH CONFIDENCE]   │   ║
║ ├───────────────────────────────────────────┤   ║
║ │ What: Adopt microservices architecture    │   ║
║ │ Why: Team scaling, need independent deploy │   ║
║ │ Alternatives: Monolith, Modular monolith   │   ║
║ │ Permanence: PERMANENT                      │   ║
║ └───────────────────────────────────────────┘   ║
║                                                   ║
║ ACTION ITEMS (2)                                  ║
║ ─────────────────────────────────────────────    ║
║ ┌───────────────────────────────────────────┐   ║
║ │ 1. Create migration script                │   ║
║ │    Responsible: Sarah                     │   ║
║ │    Blocker: Waiting for schema approval   │   ║
║ └───────────────────────────────────────────┘   ║
║ ┌───────────────────────────────────────────┐   ║
║ │ 2. Update documentation                   │   ║
║ │    Responsible: Team                      │   ║
║ └───────────────────────────────────────────┘   ║
║                                                   ║
║ AGILE CONTEXT                                     ║
║ ─────────────────────────────────────────────    ║
║ [Architecture Decision] [Technical Proposal]      ║
║                                                   ║
║ ┌───────────────────────────────────────────┐   ║
║ │ ⚠️ FUTURE DEVELOPER NOTE                  │   ║
║ ├───────────────────────────────────────────┤   ║
║ │ This decision was made before we had the  │   ║
║ │ new caching layer. Consider cache impact  │   ║
║ │ if revisiting.                            │   ║
║ └───────────────────────────────────────────┘   ║
║                                                   ║
║ ⚠️ This topic has been discussed before.         ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

## 🎨 Visual Indicators

### Colors
- **Green Badge** = High Confidence
- **Yellow Badge** = Medium Confidence  
- **Red Badge** = Low Confidence
- **Yellow Box** = Future Developer Note (Important!)
- **Orange Alert** = Repeated Topic Warning
- **Blue Alert** = Needs Background Warning
- **Red Alert** = Risk Warning

### Icons
- ⚠️ = Warning/Important
- 🔁 = Repeated Topic
- ℹ️ = Information
- ✓ = Completed/Approved

## 📱 Responsive Design

### Desktop
- Full width component
- All sections visible
- Side-by-side layout for some elements

### Tablet
- Stacked layout
- Scrollable sections
- Touch-friendly buttons

### Mobile
- Single column
- Collapsible sections
- Large touch targets

## 🔍 Finding It in Code

### Frontend File
```
frontend/src/pages/ConversationDetail.js
```

### Component Location (Line ~300+)
```javascript
{/* Reply Form */}
<div className="bg-white border border-gray-200 p-6">
  {/* Reply form content */}
</div>

{/* Developer Insights */}
<DeveloperInsights conversationId={id} />  ← HERE!
```

### Component File
```
frontend/src/components/DeveloperInsights.js
```

## 🎯 Quick Navigation

### From Homepage
```
Home → Conversations → Click Any Conversation → Scroll Down → See "DEVELOPER INSIGHTS"
```

### From Conversations List
```
Conversations List → Click Conversation → Scroll Down → See "DEVELOPER INSIGHTS"
```

### Direct URL
```
http://localhost:3000/conversations/123
(Scroll to bottom)
```

## ✅ Checklist

Before using, make sure:
- [ ] Backend is running (`python manage.py runserver`)
- [ ] Frontend is running (`npm start`)
- [ ] You're logged in
- [ ] You're viewing a conversation detail page
- [ ] You've scrolled to the bottom
- [ ] You see "DEVELOPER INSIGHTS" section
- [ ] Button says "ANALYZE WITH DEVELOPER MODE"

## 🚀 First Time Setup

1. **Clone repo** (if not done)
2. **Install backend** (`pip install -r requirements.txt`)
3. **Install frontend** (`npm install`)
4. **Run migrations** (`python manage.py migrate`)
5. **Start backend** (`python manage.py runserver`)
6. **Start frontend** (`npm start`)
7. **Login** at `http://localhost:3000`
8. **Go to any conversation**
9. **Scroll down**
10. **Click "ANALYZE WITH DEVELOPER MODE"**

## 💡 Pro Tips

### Tip 1: Bookmark a Good Example
Find a conversation with a clear technical decision and bookmark it for demos.

### Tip 2: Use Refresh
If conversation is updated, click "REFRESH" to reprocess with new content.

### Tip 3: Check Warnings
Yellow/orange/red warnings provide valuable context about the discussion.

### Tip 4: Share Insights
Copy the insights to share with team members who weren't in the discussion.

### Tip 5: Export as ADR
Use the "Export as ADR" button (in DeveloperTools) to save insights as markdown.

## 📞 Need Help?

**Check:**
1. Browser console for errors (F12)
2. Backend logs for API errors
3. Network tab for failed requests

**Common Issues:**
- "Button not showing" → Check component is imported
- "Processing fails" → Check Anthropic API key
- "No insights" → Conversation may be too short

**Documentation:**
- `DEVELOPER_ASSISTANT.md` - Full guide
- `DEVELOPER_ASSISTANT_QUICK_REF.md` - Quick reference
- `HOW_TO_ACCESS.md` - This file

---

**Remember:** Just scroll to the bottom of any conversation and click the button!
