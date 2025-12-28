import anthropic
import json
from django.conf import settings

class AIProcessor:
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=settings.ANTHROPIC_API_KEY
        )
    
    def _call_claude(self, prompt, max_tokens=1000):
        try:
            message = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text
        except Exception as e:
            print(f"Claude API error: {str(e)}")
            return f"AI processing error: {str(e)}"
    
    def generate_summary(self, content):
        prompt = f"""Summarize this workplace conversation in 2-3 sentences, focusing on key points and decisions:

{content}

Summary:"""
        return self._call_claude(prompt, 200)
    
    def extract_action_items(self, content):
        prompt = f"""Extract action items from this conversation. Return as JSON array with format:
[{{"title": "action description", "priority": "high/medium/low"}}]

{content}

Action items:"""
        
        result = self._call_claude(prompt, 300)
        try:
            return json.loads(result)
        except:
            return []
    
    def extract_keywords(self, content):
        prompt = f"""Extract 5-8 relevant keywords/topics from this conversation. Return as JSON array:
["keyword1", "keyword2", ...]

{content}

Keywords:"""
        
        result = self._call_claude(prompt, 100)
        try:
            return json.loads(result)
        except:
            return []
    
    def generate_simple_explanation(self, title, content, summary=None):
        """Generate simple, plain-language explanation"""
        prompt = f"""Explain this in simple terms that anyone can understand:

Title: {title}

Content: {content}

{f'Summary: {summary}' if summary else ''}

Rewrite this in plain language:
- Use simple words (avoid jargon)
- Short sentences
- Explain like talking to someone new to the topic
- Focus on what matters and why
- Maximum 3-4 sentences

Simple explanation:"""
        return self._call_claude(prompt, 300)
    
    def check_complexity(self, title, content):
        """Check if content is hard for new team members to understand"""
        prompt = f"""Analyze this conversation for complexity. Return JSON:
{{
  "is_complex": true/false,
  "complexity_score": 0-100,
  "issues": ["issue1", "issue2"],
  "acronyms": ["ACRONYM1", "ACRONYM2"],
  "assumptions": ["assumption1", "assumption2"]
}}

Title: {title}
Content: {content}

Check for:
- Unexplained acronyms
- Technical jargon
- Assumed context
- Industry-specific terms

Analysis:"""
        
        result = self._call_claude(prompt, 400)
        try:
            return json.loads(result)
        except:
            return {
                'is_complex': False,
                'complexity_score': 0,
                'issues': [],
                'acronyms': [],
                'assumptions': []
            }

def generate_simple_explanation(title, content, summary=None):
    processor = AIProcessor()
    return processor.generate_simple_explanation(title, content, summary)