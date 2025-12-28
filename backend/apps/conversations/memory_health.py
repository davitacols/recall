def calculate_memory_health_score(conversation):
    """Calculate 0-100 memory health score based on documentation quality"""
    score = 50  # Base score
    
    # Has title and content (required)
    if conversation.title and conversation.content:
        score += 10
    
    # Has context/why it matters
    if conversation.context_reason or conversation.why_this_matters:
        score += 15
    
    # Has key takeaway
    if conversation.key_takeaway:
        score += 10
    
    # Has AI summary
    if conversation.ai_summary:
        score += 10
    
    # Has replies (engagement)
    if conversation.reply_count > 0:
        score += min(conversation.reply_count * 2, 10)
    
    # Is closed with summary
    if conversation.is_closed and conversation.closure_summary:
        score += 15
    
    # Has owner assigned
    if conversation.owner:
        score += 5
    
    # Has tags
    if conversation.tags.exists():
        score += 5
    
    # Penalties
    if not conversation.ai_processed:
        score -= 10
    
    if conversation.is_archived and not conversation.closure_summary:
        score -= 15
    
    return max(0, min(100, score))

def get_health_indicator(score):
    """Return emoji indicator for health score"""
    if score >= 75:
        return '🟢'  # Well-documented
    elif score >= 50:
        return '🟡'  # Some gaps
    else:
        return '🔴'  # High risk of confusion
