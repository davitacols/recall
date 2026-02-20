import anthropic
from django.conf import settings

class AIService:
    
    @staticmethod
    def generate_summary(content, content_type='conversation'):
        """Generate automatic summary of content"""
        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            prompt = f"""Summarize this {content_type} in 2-3 concise sentences. Focus on key points and decisions.

Content:
{content}

Summary:"""
            
            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return message.content[0].text.strip()
        except Exception as e:
            return f"Summary unavailable: {str(e)}"
    
    @staticmethod
    def suggest_related_content(content, content_type='conversation'):
        """Suggest related conversations, decisions, or knowledge articles"""
        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            prompt = f"""Based on this {content_type}, suggest 3 relevant topics or questions that should be explored or documented.

Content:
{content}

Suggestions (one per line):"""
            
            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}]
            )
            
            suggestions = message.content[0].text.strip().split('\n')
            return [s.strip('- ').strip() for s in suggestions if s.strip()][:3]
        except Exception as e:
            return []
    
    @staticmethod
    def extract_action_items(content):
        """Extract action items from meeting notes or conversations"""
        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            prompt = f"""Extract action items from this content. List each action item on a new line starting with "- ".

Content:
{content}

Action Items:"""
            
            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )
            
            items = message.content[0].text.strip().split('\n')
            return [item.strip('- ').strip() for item in items if item.strip()]
        except Exception as e:
            return []
    
    @staticmethod
    def suggest_tags(content):
        """Suggest relevant tags for content"""
        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            prompt = f"""Suggest 3-5 relevant tags for this content. Return only comma-separated tags.

Content:
{content}

Tags:"""
            
            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=50,
                messages=[{"role": "user", "content": prompt}]
            )
            
            tags = message.content[0].text.strip().split(',')
            return [tag.strip().lower() for tag in tags if tag.strip()][:5]
        except Exception as e:
            return []
