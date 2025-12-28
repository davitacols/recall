"""
Developer Productivity Assistant
Processes developer conversations into structured, durable organizational memory
"""

import anthropic
import json
from django.conf import settings

class DeveloperAssistant:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    def process_developer_conversation(self, conversation_data):
        """
        Process developer conversation using Developer Productivity Assistant prompt
        
        Args:
            conversation_data: dict with keys:
                - title: str
                - content: str
                - author: str (optional)
                - post_type: str (optional)
                - context: str (optional)
        
        Returns:
            dict with structured analysis
        """
        
        prompt = self._build_prompt(conversation_data)
        
        try:
            message = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            return self._parse_response(response_text)
            
        except Exception as e:
            return {
                'error': str(e),
                'simple_summary': 'AI processing failed',
                'technical_decision': None,
                'action_items': [],
                'agile_context': [],
                'future_developer_note': None
            }
    
    def _build_prompt(self, data):
        """Build the Developer Productivity Assistant prompt"""
        
        title = data.get('title', '')
        content = data.get('content', '')
        author = data.get('author', 'Unknown')
        post_type = data.get('post_type', '')
        context = data.get('context', '')
        
        prompt = f"""You are Recall's Developer Productivity Assistant.

Recall is a knowledge-first collaboration platform. Your job is to help software development teams turn everyday technical conversations into long-term organizational memory that improves productivity, alignment, and decision quality.

You are NOT a task tracker.
You are NOT a project management tool.
You do NOT create tickets, deadlines, or sprint metrics.

Your purpose is to:
• Capture technical decisions and their reasoning
• Preserve context behind code and architecture
• Reduce repeated discussions
• Support Agile thinking without Agile bureaucracy
• Help future developers understand "why this exists"

Always use clear, plain language that non-technical stakeholders can understand.
Assume the output will be read months or years later.

---

CONVERSATION TO ANALYZE:

Title: {title}
Type: {post_type}
Author: {author}
{f'Context: {context}' if context else ''}

Content:
{content}

---

Generate the following sections only when applicable:

1️⃣ Simple Summary
Explain what the discussion is about in clear, everyday language.
A new developer should understand this without reading the full conversation.

2️⃣ Technical Decision
If a decision was made:
• What was decided
• Why it was decided
• Alternatives mentioned (if any)
• Whether the decision appears permanent or temporary
• Confidence level: High / Medium / Low

If no decision was made, clearly state:
"No final decision was made in this discussion."

3️⃣ Action Items (If Mentioned)
List any next steps that were explicitly discussed.
Include:
• What needs to be done
• Who is responsible (if mentioned)
• Known blockers

If none exist, state:
"No action items were identified."

4️⃣ Agile Context
Classify the discussion into one or more categories:
• Sprint Planning
• Daily Update
• Technical Proposal
• Architecture Decision
• Retrospective Insight
• Experiment / Spike

5️⃣ Future Developer Note
Write 1–2 sentences answering:
"What should a future developer know about this?"

This is the most important section.

OPTIONAL INTELLIGENCE (Only When Relevant):
• If this topic appears to repeat past discussions, say:
"This topic has been discussed before."

• If context may be unclear for new team members, say:
"Additional background may be needed for new team members."

• If risk or uncertainty exists, state it neutrally.

STRICT RULES:
• Do NOT invent decisions or conclusions
• Do NOT assign responsibility unless explicitly stated
• Do NOT enforce Agile rules or ceremonies
• Do NOT use managerial or judgmental language
• If information is missing, say so clearly

GUIDING PRINCIPLE:
Your output should make a developer think:
"I understand what happened, why it happened, and whether it still matters."

Format your response as JSON:
{{
  "simple_summary": "...",
  "technical_decision": {{
    "decision_made": true/false,
    "what_decided": "...",
    "why_decided": "...",
    "alternatives": ["...", "..."],
    "permanence": "permanent/temporary/unclear",
    "confidence_level": "high/medium/low"
  }},
  "action_items": [
    {{
      "task": "...",
      "responsible": "...",
      "blockers": "..."
    }}
  ],
  "agile_context": ["Sprint Planning", "Technical Proposal"],
  "future_developer_note": "...",
  "warnings": {{
    "repeated_topic": false,
    "needs_background": false,
    "has_risk": false,
    "risk_description": "..."
  }}
}}"""
        
        return prompt
    
    def _parse_response(self, response_text):
        """Parse AI response into structured format"""
        try:
            # Try to extract JSON from response
            if '```json' in response_text:
                json_start = response_text.find('```json') + 7
                json_end = response_text.find('```', json_start)
                json_text = response_text[json_start:json_end].strip()
            elif '{' in response_text:
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                json_text = response_text[json_start:json_end]
            else:
                json_text = response_text
            
            data = json.loads(json_text)
            return data
            
        except json.JSONDecodeError:
            # Fallback: return raw text
            return {
                'simple_summary': response_text[:500],
                'technical_decision': None,
                'action_items': [],
                'agile_context': [],
                'future_developer_note': response_text[-200:] if len(response_text) > 200 else response_text,
                'warnings': {}
            }


def process_as_developer_conversation(conversation):
    """
    Process a conversation using Developer Productivity Assistant
    
    Args:
        conversation: Conversation model instance
    
    Returns:
        dict with structured analysis
    """
    assistant = DeveloperAssistant()
    
    conversation_data = {
        'title': conversation.title,
        'content': conversation.content,
        'author': conversation.author.get_full_name(),
        'post_type': conversation.post_type,
        'context': conversation.context_reason or conversation.why_this_matters or ''
    }
    
    return assistant.process_developer_conversation(conversation_data)
