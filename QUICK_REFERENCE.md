# Developer Productivity - Quick Reference

## 🚀 Quick Start

### 1. Use a Template
```bash
GET /api/conversations/templates/
GET /api/conversations/templates/architecture/
```

### 2. Create Decision
```json
POST /api/conversations/
{
  "title": "Architecture: Microservices",
  "content": "We chose microservices...",
  "post_type": "decision",
  "context_reason": "Need to scale team",
  "alternatives_considered": "Monolith, Modular monolith",
  "tradeoffs": "Complexity vs Scalability",
  "key_takeaway": "Microservices for team autonomy"
}
```

### 3. Add Code Link
```json
POST /api/conversations/{id}/code-links/
{
  "title": "PR #123",
  "url": "https://github.com/org/repo/pull/123",
  "type": "pr"
}
```

### 4. Export ADR
```bash
GET /api/conversations/{id}/export-adr/
# Downloads: ADR-0001-title.md
```

### 5. Generate Plain Language
```bash
POST /api/conversations/{id}/plain-language/
# Returns simple explanation
```

### 6. Vote Confidence
```json
POST /api/conversations/{id}/vote_confidence/
{
  "confidence": 8
}
```

## 📋 Available Templates

| Key | Name | Use For |
|-----|------|---------|
| `architecture` | Architecture Decision | System design |
| `tech_stack` | Technology Choice | Library/framework |
| `api_design` | API Design | Interface design |
| `refactor` | Refactoring | Code improvements |
| `bug_postmortem` | Bug Postmortem | Incident analysis |
| `performance` | Performance | Optimization work |
| `security` | Security Decision | Security approaches |
| `database` | Database Schema | Data modeling |

## 🔗 Code Link Types

- `pr` - Pull Request
- `commit` - Git Commit
- `doc` - Documentation
- `other` - Other resources

## 📊 New Fields

### Conversation
- `alternatives_considered` - What else did we consider?
- `tradeoffs` - What are we trading?
- `code_links` - Links to PRs/commits
- `plain_language_summary` - Simple explanation

### Decision
- `tradeoffs` - Decision tradeoffs
- `code_links` - Implementation links
- `plain_language_summary` - Non-technical summary
- `confidence_level` - Average confidence (1-10)
- `confidence_votes` - All votes

## 🎯 Best Practices

### DO
✅ Use templates for consistency
✅ Link to actual code (PRs, commits)
✅ Explain tradeoffs honestly
✅ Generate plain language for stakeholders
✅ Export ADRs to version control
✅ Vote confidence on decisions

### DON'T
❌ Skip context_reason
❌ Forget alternatives considered
❌ Hide tradeoffs
❌ Use jargon without explanation
❌ Create decisions without discussion

## 🧪 Test Your Setup

```bash
cd backend
python test_dev_features.py
```

Should see:
```
[OK] Found 8 templates
[OK] Generated ADR
[OK] All fields present
[SUCCESS] ALL TESTS PASSED
```

## 📖 Full Documentation

- `DEVELOPER_PRODUCTIVITY.md` - Complete guide
- `IMPLEMENTATION_COMPLETE.md` - Implementation details
- `HIGH_IMPACT_FEATURES.md` - Other features

## 💡 Example Workflow

```
1. New technical decision needed
   ↓
2. Load template (e.g., architecture)
   ↓
3. Fill in fields:
   - Context reason (why now?)
   - Alternatives (what else?)
   - Tradeoffs (what cost?)
   - Key takeaway (one sentence)
   ↓
4. Team discusses and votes confidence
   ↓
5. Add code links (PRs, docs)
   ↓
6. Generate plain language for leadership
   ↓
7. Export as ADR for repo
   ↓
8. Decision preserved forever ✨
```

## 🎓 Remember

> "You're not creating tickets. You're preserving knowledge."

Focus on:
- **Why** (not just what)
- **Context** (not just facts)
- **Tradeoffs** (not just benefits)
- **Future readers** (not just today)

---

**Questions?** Check the full docs or create a conversation in Recall!
