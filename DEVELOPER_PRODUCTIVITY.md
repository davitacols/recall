# Developer Productivity Features

## Overview
Recall helps software development teams capture technical decisions and preserve context without bureaucracy. These features turn everyday technical conversations into long-term organizational memory.

## Core Philosophy

**We are NOT:**
- A task tracker
- A project management tool
- A ticket system

**We ARE:**
- A decision capture system
- A context preservation tool
- A "why this exists" documentation platform

## Features

### 1. Technical Decision Templates

**Purpose**: Pre-structured formats for common technical decisions

**Available Templates:**
- **Architecture Decision** - System design choices
- **Technology Choice** - Library/framework selection
- **API Design Decision** - Interface design
- **Refactoring Decision** - Code improvement plans
- **Bug Postmortem** - Incident analysis
- **Performance Investigation** - Optimization work
- **Security Decision** - Security approaches
- **Database Schema** - Data modeling

**Usage:**
```javascript
// Frontend
GET /api/conversations/templates/
GET /api/conversations/templates/{template_key}/

// Response
{
  "name": "Architecture Decision",
  "post_type": "decision",
  "fields": {
    "title": "Architecture: [Component Name]",
    "context_reason": "What problem are we solving?",
    "content": "## Decision\n...",
    "key_takeaway": "One sentence summary",
    "if_this_fails": "Rollback plan"
  }
}
```

**Template Keys:**
- `architecture`
- `tech_stack`
- `api_design`
- `refactor`
- `bug_postmortem`
- `performance`
- `security`
- `database`

### 2. Architecture Decision Records (ADR) Export

**Purpose**: Export decisions in standard ADR markdown format

**Format:**
```markdown
# ADR-0001: Decision Title

## Status
Accepted

## Date
2024-01-15

## Context
Why are we making this decision?

## Decision
What did we decide?

## Alternatives Considered
1. Option A - Why not
2. Option B - Why not

## Tradeoffs
What we gain vs. what we give up

## Consequences
### If This Fails
Rollback plan

## References
- [PR #123](url)
- [Commit abc123](url)

## Metadata
- Author: John Doe
- Decision Maker: Jane Smith
- Team Confidence: 8/10 (4 votes)
```

**API:**
```javascript
GET /api/conversations/{id}/export-adr/

// Response
{
  "content": "# ADR-0001: ...",
  "filename": "ADR-0001-decision-title.md"
}
```

**Usage:**
- Click "Export as ADR" button
- Automatically downloads markdown file
- Standard format recognized by dev teams
- Can be committed to repo

### 3. Plain Language Explanation

**Purpose**: Auto-generate simple explanations for non-technical stakeholders

**How it works:**
- Uses AI to rewrite technical content
- Removes jargon
- Explains acronyms
- Focuses on "what" and "why"
- Maximum 3-4 sentences

**API:**
```javascript
POST /api/conversations/{id}/plain-language/

// Response
{
  "plain_language_summary": "We're switching from MySQL to PostgreSQL because we need better support for complex queries. This will make our reports faster but requires migrating our data over one weekend."
}
```

**Use Cases:**
- Leadership updates
- Cross-team communication
- Onboarding new members
- Quarterly reviews

### 4. Code Context Links

**Purpose**: Link decisions to actual code

**Link Types:**
- Pull Requests
- Commits
- Documentation
- Other resources

**API:**
```javascript
POST /api/conversations/{id}/code-links/
{
  "title": "PR #123: Implement new auth",
  "url": "https://github.com/org/repo/pull/123",
  "type": "pr"
}

// Response
{
  "message": "Link added",
  "links": [
    {
      "title": "PR #123",
      "url": "...",
      "type": "pr",
      "added_by": "John Doe",
      "added_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Benefits:**
- Connect decisions to implementation
- Easy code review reference
- Historical context for future changes
- Traceability

## New Database Fields

### Conversation Model
```python
alternatives_considered = TextField()  # What other options?
tradeoffs = TextField()                # What are we trading?
code_links = JSONField()               # Links to PRs, commits
plain_language_summary = TextField()   # Simple explanation
```

### Decision Model
```python
tradeoffs = TextField()                # Decision tradeoffs
code_links = JSONField()               # Implementation links
plain_language_summary = TextField()   # Non-technical summary
```

## API Endpoints

### Templates
- `GET /api/conversations/templates/` - List all templates
- `GET /api/conversations/templates/{key}/` - Get specific template

### ADR Export
- `GET /api/conversations/{id}/export-adr/` - Export as ADR markdown

### Plain Language
- `POST /api/conversations/{id}/plain-language/` - Generate simple explanation

### Code Links
- `POST /api/conversations/{id}/code-links/` - Add code reference

### Confidence Voting
- `POST /api/conversations/{id}/vote_confidence/` - Vote 1-10 on decision

## Frontend Components

### DeveloperTools.js
Complete developer toolbox:
- Export ADR button
- Generate plain language
- Add code links
- View templates

### TemplateSelector.js
Template picker for new conversations:
- Browse templates
- Load template fields
- Pre-fill conversation

## Usage Examples

### Example 1: Architecture Decision
```javascript
// 1. Create conversation using template
const template = await getTemplate('architecture');

// 2. Fill in fields
const conversation = {
  title: "Architecture: Microservices vs Monolith",
  context_reason: "App is growing, team is scaling",
  content: template.fields.content,
  alternatives_considered: "Monolith, Modular monolith, Microservices",
  tradeoffs: "Complexity vs Scalability",
  key_takeaway: "We chose microservices for team autonomy",
  if_this_fails: "Can consolidate services back into monolith"
};

// 3. Add code links
await addCodeLink(conversationId, {
  title: "Architecture Diagram",
  url: "https://docs.company.com/arch",
  type: "doc"
});

// 4. Export as ADR
await exportADR(conversationId);
```

### Example 2: Bug Postmortem
```javascript
// 1. Use postmortem template
const template = await getTemplate('bug_postmortem');

// 2. Document incident
const conversation = {
  title: "Postmortem: Database Connection Pool Exhaustion",
  context_reason: "Production outage for 2 hours",
  content: "Root cause: Connection leak in payment service...",
  key_takeaway: "Added connection pool monitoring and auto-scaling",
  emotional_context: "urgent"
};

// 3. Link to fix
await addCodeLink(conversationId, {
  title: "Fix PR #456",
  url: "https://github.com/org/repo/pull/456",
  type: "pr"
});

// 4. Generate plain language for leadership
await generatePlainLanguage(conversationId);
```

## Best Practices

### For Developers
1. **Use templates** - Don't start from scratch
2. **Link to code** - Connect decisions to implementation
3. **Explain tradeoffs** - Future you will thank you
4. **Export ADRs** - Commit to repo for version control
5. **Vote confidence** - Track which decisions worked

### For Tech Leads
1. **Review plain language** - Ensure stakeholders understand
2. **Check memory health** - Ensure decisions are well-documented
3. **Export ADRs regularly** - Build decision history
4. **Encourage context** - Push team to explain "why"

### For Product Managers
1. **Read plain language** - Understand technical decisions
2. **Review tradeoffs** - Know what we're giving up
3. **Check confidence votes** - Gauge team alignment
4. **Link to outcomes** - Connect decisions to results

## Integration with Existing Features

### Works with:
- **Memory Health Score** - Templates improve documentation quality
- **Confidence Voting** - Track team belief in technical decisions
- **Emotional Context** - Tag urgent/risky technical decisions
- **AI Processing** - Auto-summarize technical discussions

### Enhances:
- **Decision Tracking** - Better structured technical decisions
- **Knowledge Search** - More searchable technical context
- **Onboarding** - Plain language helps new team members

## Migration Guide

### Database
```bash
python manage.py migrate
# Adds: alternatives_considered, tradeoffs, code_links, plain_language_summary
```

### Frontend
```javascript
import DeveloperTools from './components/DeveloperTools';
import TemplateSelector from './components/TemplateSelector';

// In conversation detail page
<DeveloperTools conversationId={id} />

// In new conversation form
<TemplateSelector onSelectTemplate={handleTemplate} />
```

## Metrics to Track

### Team Adoption
- Templates used per week
- ADRs exported per month
- Code links added per decision
- Plain language generations

### Quality Indicators
- Memory health score trends
- Confidence vote averages
- Decision implementation rate
- Context completeness

## Future Enhancements

### Planned
- GitHub integration (auto-link PRs)
- Slack integration (post ADRs)
- Template customization
- Decision impact tracking
- "Similar decisions" finder

### Under Consideration
- Code snippet embedding
- Diagram support
- Video explanations
- Decision dependencies graph

## Support

For questions or issues:
1. Check existing decisions in Recall
2. Review templates for guidance
3. Export ADR for offline reference
4. Generate plain language for clarity

## Philosophy

> "The best documentation is the one that explains why, not just what."

Recall helps teams answer:
- Why does this code exist?
- What alternatives did we consider?
- What would we do differently?
- How confident were we?

This prevents:
- Repeated discussions
- Lost context
- Bad decisions made twice
- Confusion for future developers

---

**Remember**: You're not creating tickets. You're preserving knowledge.
