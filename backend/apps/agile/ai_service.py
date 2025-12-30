import anthropic
from django.conf import settings

def generate_sprint_update_summary(title, content):
    """Generate AI summary for sprint update using Claude"""
    if not settings.ANTHROPIC_API_KEY:
        # Fallback to simple summary
        words = content.split()
        return f"Summary: {' '.join(words[:20])}..." if len(words) > 20 else content
    
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=150,
            messages=[{
                "role": "user",
                "content": f"Summarize this sprint update in 1-2 sentences. Be concise and focus on key points.\n\nTitle: {title}\n\nContent: {content}"
            }]
        )
        
        return message.content[0].text.strip()
    except Exception as e:
        print(f"AI summary failed: {e}")
        words = content.split()
        return f"Summary: {' '.join(words[:20])}..." if len(words) > 20 else content

def detect_action_items(content):
    """Detect action items from sprint update"""
    if not settings.ANTHROPIC_API_KEY:
        return []
    
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": f"Extract action items from this text. Return only a JSON array of strings, nothing else.\n\n{content}"
            }]
        )
        
        import json
        return json.loads(message.content[0].text.strip())
    except:
        return []

def generate_retrospective_summary(sprint_name, what_went_well, what_needs_improvement):
    """Generate retrospective summary"""
    if not settings.ANTHROPIC_API_KEY:
        return "Retrospective completed."
    
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": f"Summarize this sprint retrospective in 2-3 sentences. Focus on key insights and patterns.\n\nSprint: {sprint_name}\n\nWhat went well:\n{chr(10).join(what_went_well)}\n\nWhat needs improvement:\n{chr(10).join(what_needs_improvement)}"
            }]
        )
        
        return message.content[0].text.strip()
    except:
        return "Retrospective completed."
