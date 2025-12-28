# How to Access Developer Productivity Assistant

## 🚀 Quick Access

### Option 1: From Any Conversation (Easiest)

1. **Open any conversation** in Recall
2. **Scroll to the bottom** of the page
3. **Look for "DEVELOPER INSIGHTS" section**
4. **Click "ANALYZE WITH DEVELOPER MODE"** button
5. **Wait 2-5 seconds** for AI processing
6. **View structured insights!**

### Option 2: Via API (For Developers)

```bash
# Process a conversation
curl -X POST http://localhost:8000/api/conversations/123/developer-mode/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get existing insights
curl http://localhost:8000/api/conversations/123/developer-insights/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📍 Where to Find It

### In the UI

**Location:** Bottom of every conversation detail page

**Path:** 
1. Go to `/conversations`
2. Click any conversation
3. Scroll down past replies
4. See "DEVELOPER INSIGHTS" section

**Visual Cue:**
- Black border box
- "DEVELOPER INSIGHTS" header in League Spartan font
- Blue "ANALYZE WITH DEVELOPER MODE" button

### What You'll See

**Before Processing:**
```
┌─────────────────────────────────────┐
│ DEVELOPER INSIGHTS                  │
│                                     │
│ [ANALYZE WITH DEVELOPER MODE]       │
│ AI-powered analysis for developer   │
│ productivity                        │
└─────────────────────────────────────┘
```

**After Processing:**
```
┌─────────────────────────────────────┐
│ DEVELOPER INSIGHTS        [REFRESH] │
│                                     │
│ SIMPLE SUMMARY                      │
│ Clear explanation...                │
│                                     │
│ TECHNICAL DECISION [HIGH CONFIDENCE]│
│ What: Decision made                 │
│ Why: Reasoning                      │
│ Alternatives: Option A, Option B    │
│                                     │
│ ACTION ITEMS (2)                    │
│ 1. Task description                 │
│    Responsible: Person              │
│                                     │
│ AGILE CONTEXT                       │
│ [Architecture Decision]             │
│                                     │
│ ⚠️ FUTURE DEVELOPER NOTE            │
│ What future devs should know        │
└─────────────────────────────────────┘
```

## 🎯 Step-by-Step First Use

### Step 1: Start Backend
```bash
cd backend
python manage.py runserver
```

### Step 2: Start Frontend
```bash
cd frontend
npm start
```

### Step 3: Login
- Go to `http://localhost:3000`
- Login with your credentials

### Step 4: Open Conversation
- Click "Conversations" in navigation
- Click any conversation from the list

### Step 5: Scroll Down
- Scroll past the conversation content
- Scroll past the replies section
- Look for "DEVELOPER INSIGHTS"

### Step 6: Click Button
- Click "ANALYZE WITH DEVELOPER MODE"
- Wait 2-5 seconds
- See structured insights appear!

## 🧪 Test It Works

### Quick Test
```bash
cd backend
python test_developer_assistant.py
```

**Expected Output:**
```
[SIMPLE SUMMARY]
Clear explanation

[TECHNICAL DECISION]
  What: Decision
  Why: Reasoning
  Confidence: high

[SUCCESS] Test completed
```

## 💡 Tips

### Best Results
- Use on conversations with technical decisions
- Include context and reasoning in conversation
- Mention alternatives considered
- Be clear about what was decided

### When to Use
✅ Architecture decisions
✅ Technical proposals
✅ Bug postmortems
✅ Sprint planning discussions
✅ Any conversation future developers need to understand

### When NOT to Use
❌ Simple status updates
❌ One-line messages
❌ Non-technical discussions

## 🔧 Troubleshooting

### "Button doesn't appear"
- Check that DeveloperInsights component is imported
- Verify frontend is running
- Clear browser cache

### "Processing fails"
- Check Anthropic API key in backend/.env
- Verify backend is running
- Check browser console for errors

### "No insights shown"
- Conversation may be too short
- Add more context to conversation
- Try clicking "REFRESH" button

## 📱 Mobile Access

The component is responsive and works on mobile:
- Same location (bottom of conversation)
- Touch-friendly buttons
- Scrollable insights

## 🎓 What You Get

### 1. Simple Summary
Plain-language explanation anyone can understand

### 2. Technical Decision
- What was decided
- Why it was decided
- Alternatives considered
- Confidence level (High/Medium/Low)

### 3. Action Items
- Tasks to do
- Who's responsible
- Known blockers

### 4. Agile Context
Auto-classification:
- Sprint Planning
- Architecture Decision
- Technical Proposal
- etc.

### 5. Future Developer Note
Most important: What should future developers know?

### 6. Warnings
- Repeated topic
- Needs background
- Has risk

## 🚀 Next Steps

After accessing:
1. **Review insights** - Check if they make sense
2. **Refresh if needed** - Click refresh for updated analysis
3. **Share with team** - Insights help everyone understand
4. **Export as ADR** - Use with other developer tools
5. **Link to code** - Add PR/commit links

## 📖 Full Documentation

- `DEVELOPER_ASSISTANT.md` - Complete guide
- `DEVELOPER_ASSISTANT_QUICK_REF.md` - Quick reference
- `DEVELOPER_PRODUCTIVITY.md` - All productivity features

## ✨ Summary

**Access:** Bottom of every conversation detail page
**Button:** "ANALYZE WITH DEVELOPER MODE"
**Time:** 2-5 seconds processing
**Result:** Structured insights for developer productivity

**That's it!** Just scroll down and click the button.
