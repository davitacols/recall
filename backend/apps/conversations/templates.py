"""
Technical Decision Templates for Developer Teams
Helps capture context without bureaucracy
"""

TEMPLATES = {
    'architecture': {
        'name': 'Architecture Decision',
        'post_type': 'decision',
        'fields': {
            'title': 'Architecture: [Component/System Name]',
            'context_reason': 'What problem are we solving? What triggered this decision?',
            'content': '''## Decision
What architecture/approach did we choose?

## Context
What's the current situation? What constraints do we have?

## Alternatives Considered
What other options did we evaluate?

## Tradeoffs
What are we gaining? What are we giving up?

## Implementation Notes
Key technical details future developers need to know.''',
            'key_takeaway': 'One sentence: What did we decide and why?',
            'if_this_fails': 'What happens if this doesn\'t work? How do we roll back?'
        }
    },
    
    'tech_stack': {
        'name': 'Technology Choice',
        'post_type': 'decision',
        'fields': {
            'title': 'Tech Choice: [Library/Framework/Tool]',
            'context_reason': 'Why are we evaluating this technology?',
            'content': '''## What We Chose
[Technology name and version]

## Why This Over Alternatives
- Alternative 1: [Why not this]
- Alternative 2: [Why not this]

## Key Benefits
- Benefit 1
- Benefit 2

## Known Limitations
- Limitation 1
- Limitation 2

## Migration Path
How do we adopt this? How do we exit if needed?''',
            'key_takeaway': 'We chose [X] because [primary reason]',
            'if_this_fails': 'Fallback plan and exit strategy'
        }
    },
    
    'api_design': {
        'name': 'API Design Decision',
        'post_type': 'decision',
        'fields': {
            'title': 'API: [Endpoint/Interface Name]',
            'context_reason': 'What use case does this API serve?',
            'content': '''## API Design
[Endpoint/method signature]

## Why This Design
What makes this the right approach?

## Alternatives Considered
What other API designs did we reject?

## Breaking Changes
Will this break existing clients? Migration plan?

## Examples
```
[Code example of usage]
```''',
            'key_takeaway': 'This API does [X] in [Y] way because [Z]',
            'if_this_fails': 'How do we version/deprecate if this design doesn\'t work?'
        }
    },
    
    'refactor': {
        'name': 'Refactoring Decision',
        'post_type': 'proposal',
        'fields': {
            'title': 'Refactor: [Component/Module]',
            'context_reason': 'What pain points are we addressing?',
            'content': '''## Current State
What's wrong with the current code?

## Proposed Changes
What will we refactor and how?

## Why Now
Why is this the right time?

## Risk Assessment
What could go wrong? How do we mitigate?

## Success Criteria
How do we know the refactor worked?''',
            'key_takeaway': 'We\'re refactoring [X] to solve [Y]',
            'if_this_fails': 'Rollback plan and what we learned'
        }
    },
    
    'bug_postmortem': {
        'name': 'Bug Postmortem',
        'post_type': 'update',
        'fields': {
            'title': 'Postmortem: [Bug Description]',
            'context_reason': 'What broke and what was the impact?',
            'content': '''## What Happened
Brief description of the bug and impact.

## Root Cause
What actually caused this?

## Why It Wasn't Caught
What in our process allowed this through?

## The Fix
What did we change?

## Prevention
What are we doing to prevent this class of bug?

## Related Code
[Links to PRs, commits]''',
            'key_takeaway': '[Bug] was caused by [X], fixed by [Y]',
            'emotional_context': 'urgent'
        }
    },
    
    'performance': {
        'name': 'Performance Investigation',
        'post_type': 'update',
        'fields': {
            'title': 'Performance: [System/Feature]',
            'context_reason': 'What performance issue are we investigating?',
            'content': '''## Symptoms
What's slow? How slow? Who's affected?

## Investigation
What did we measure? What tools did we use?

## Root Cause
What's causing the slowness?

## Solution
What did we optimize?

## Results
Before/after metrics.

## Monitoring
How do we prevent regression?''',
            'key_takeaway': 'Improved [X] from [A] to [B] by [doing Y]'
        }
    },
    
    'security': {
        'name': 'Security Decision',
        'post_type': 'decision',
        'fields': {
            'title': 'Security: [Feature/Component]',
            'context_reason': 'What security concern are we addressing?',
            'content': '''## Security Issue
What's the threat or vulnerability?

## Approach
How are we securing this?

## Alternatives Considered
What other security approaches did we evaluate?

## Tradeoffs
Security vs. usability/performance tradeoffs.

## Compliance
Any regulatory requirements?''',
            'key_takeaway': 'We secured [X] using [Y] approach',
            'emotional_context': 'risky',
            'if_this_fails': 'Incident response plan'
        }
    },
    
    'database': {
        'name': 'Database Schema Decision',
        'post_type': 'decision',
        'fields': {
            'title': 'Schema: [Table/Model Name]',
            'context_reason': 'What data are we modeling?',
            'content': '''## Schema Design
[Table structure or model definition]

## Why This Structure
What makes this the right data model?

## Alternatives Considered
What other schemas did we reject?

## Migration Strategy
How do we deploy this change?

## Performance Considerations
Indexes, query patterns, scaling concerns.''',
            'key_takeaway': 'We modeled [X] as [Y] because [Z]',
            'if_this_fails': 'Rollback and data migration plan'
        }
    }
}

def get_template(template_key):
    """Get a specific template by key"""
    return TEMPLATES.get(template_key)

def list_templates():
    """List all available templates"""
    return [
        {
            'key': key,
            'name': template['name'],
            'post_type': template['post_type']
        }
        for key, template in TEMPLATES.items()
    ]
