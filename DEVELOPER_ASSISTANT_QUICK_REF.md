# Developer Assistant - Quick Reference Card

## 🚀 One-Minute Guide

### What It Does
Transforms developer conversations into structured organizational memory.

### When to Use
- Architecture decisions
- Technical proposals
- Bug postmortems
- Sprint planning discussions
- Any conversation future developers need to understand

### How to Use

**1. Create conversation** (or use existing)

**2. Click "Analyze with Developer Mode"**

**3. Get structured insights:**
- ✅ Simple Summary
- ✅ Technical Decision
- ✅ Action Items
- ✅ Agile Context
- ✅ Future Developer Note
- ✅ Warnings

## 📋 Output Structure

```
SIMPLE SUMMARY
→ Plain-language explanation

TECHNICAL DECISION
→ What: The decision
→ Why: The reasoning
→ Alternatives: What else was considered
→ Confidence: High/Medium/Low

ACTION ITEMS
→ Task + Responsible + Blockers

AGILE CONTEXT
→ Sprint Planning | Architecture Decision | etc.

FUTURE DEVELOPER NOTE
→ What future devs should know

WARNINGS
→ Repeated topic | Needs background | Has risk
```

## 🎯 API Endpoints

```bash
# Process conversation
POST /api/conversations/{id}/developer-mode/

# Get insights
GET /api/conversations/{id}/developer-insights/
```

## 💻 Frontend Component

```jsx
import DeveloperInsights from './components/DeveloperInsights';

<DeveloperInsights conversationId={id} />
```

## ✅ Best Practices

**DO:**
- Include context and reasoning
- Mention alternatives
- Be honest about uncertainty
- Think about future readers

**DON'T:**
- Use for simple status updates
- Skip the "why"
- Invent decisions
- Use jargon without explanation

## 🧪 Test It

```bash
cd backend
python test_developer_assistant.py
```

## 📊 Database Fields

```python
dev_simple_summary          # Simple explanation
dev_technical_decision      # Structured decision
dev_action_items           # Action items list
dev_agile_context          # Classification
dev_future_note            # Future dev note
dev_warnings               # Warning flags
```

## 🎓 Philosophy

**You're not creating tickets.**
**You're preserving knowledge.**

Focus on:
- Why (not just what)
- Context (not just facts)
- Future readers (not just today)

## 📖 Full Docs

- `DEVELOPER_ASSISTANT.md` - Complete guide
- `DEVELOPER_ASSISTANT_SUMMARY.md` - Implementation details
- `DEVELOPER_PRODUCTIVITY.md` - All productivity features

## 💡 Example

**Input:**
```
Title: "API Design: REST vs GraphQL"
Content: "Decided on GraphQL for flexible mobile queries. 
Considered REST but too rigid. Risk: learning curve."
```

**Output:**
```
Simple Summary: "We chose GraphQL over REST for our mobile 
API because it gives clients more flexibility..."

Technical Decision:
  What: GraphQL API
  Why: Flexible queries for mobile
  Alternatives: REST API
  Confidence: Medium
  
Future Note: "Made before new caching layer. Consider 
cache invalidation if revisiting."
```

## ⚡ Quick Stats

- **Processing:** 2-5 seconds
- **Cost:** ~$0.001 per conversation
- **Model:** Claude 3 Haiku
- **Token Usage:** ~1500 average

## 🎯 Key Benefit

**Answers the question:**
> "What happened, why did it happen, and does it still matter?"

---

**Ready to use!** Just click "Analyze with Developer Mode" on any conversation.
