"""
Architecture Decision Record (ADR) Export
Converts Recall decisions to standard ADR format
"""

from datetime import datetime

def export_to_adr(conversation, decision=None):
    """
    Export conversation/decision to ADR markdown format
    Follows the standard ADR template used by development teams
    """
    
    # ADR number (use conversation ID)
    adr_number = f"{conversation.id:04d}"
    
    # Status
    status = "Accepted"
    if decision:
        status_map = {
            'proposed': 'Proposed',
            'under_review': 'Proposed',
            'approved': 'Accepted',
            'rejected': 'Rejected',
            'implemented': 'Accepted',
            'cancelled': 'Superseded'
        }
        status = status_map.get(decision.status, 'Proposed')
    
    # Date
    date = conversation.created_at.strftime('%Y-%m-%d')
    
    # Build ADR content
    adr = f"""# ADR-{adr_number}: {conversation.title}

## Status
{status}

## Date
{date}

## Context
{conversation.context_reason or conversation.why_this_matters or 'No context provided'}

## Decision
{conversation.content}

"""
    
    # Add key takeaway if exists
    if conversation.key_takeaway:
        adr += f"""## Summary
{conversation.key_takeaway}

"""
    
    # Add alternatives if exists
    if conversation.alternatives_considered:
        adr += f"""## Alternatives Considered
{conversation.alternatives_considered}

"""
    elif decision and decision.alternatives_considered:
        alternatives = decision.alternatives_considered
        if isinstance(alternatives, list):
            adr += "## Alternatives Considered\n"
            for i, alt in enumerate(alternatives, 1):
                adr += f"{i}. {alt}\n"
            adr += "\n"
    
    # Add tradeoffs if exists
    if conversation.tradeoffs:
        adr += f"""## Tradeoffs
{conversation.tradeoffs}

"""
    elif decision and decision.tradeoffs:
        adr += f"""## Tradeoffs
{decision.tradeoffs}

"""
    
    # Add consequences/risks
    if decision and decision.if_this_fails:
        adr += f"""## Consequences
### If This Fails
{decision.if_this_fails}

"""
    
    # Add code links if exists
    code_links = conversation.code_links or (decision.code_links if decision else [])
    if code_links and len(code_links) > 0:
        adr += "## References\n"
        for link in code_links:
            if isinstance(link, dict):
                adr += f"- [{link.get('title', 'Link')}]({link.get('url', '')})\n"
            else:
                adr += f"- {link}\n"
        adr += "\n"
    
    # Add metadata
    adr += f"""## Metadata
- **Author**: {conversation.author.get_full_name()}
- **Decision Maker**: {decision.decision_maker.get_full_name() if decision and decision.decision_maker else conversation.author.get_full_name()}
- **Created**: {date}
"""
    
    if decision and decision.decided_at:
        adr += f"- **Decided**: {decision.decided_at.strftime('%Y-%m-%d')}\n"
    
    if conversation.emotional_context:
        context_map = {
            'urgent': '🚨 Urgent',
            'consensus': '🤝 Consensus',
            'risky': '⚠️ Risky',
            'experimental': '💡 Experimental'
        }
        adr += f"- **Context**: {context_map.get(conversation.emotional_context, conversation.emotional_context)}\n"
    
    # Add confidence if exists
    if decision and decision.confidence_level:
        adr += f"- **Team Confidence**: {decision.confidence_level}/10"
        if decision.confidence_votes:
            adr += f" ({len(decision.confidence_votes)} votes)"
        adr += "\n"
    
    return adr

def generate_adr_filename(conversation):
    """Generate standard ADR filename"""
    adr_number = f"{conversation.id:04d}"
    # Slugify title
    slug = conversation.title.lower()
    slug = ''.join(c if c.isalnum() or c in ' -' else '' for c in slug)
    slug = '-'.join(slug.split())[:50]
    return f"ADR-{adr_number}-{slug}.md"
