import anthropic
from django.conf import settings
from apps.knowledge.models import KnowledgeEntry
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

class AIService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    def search_knowledge(self, query, organization):
        """Search knowledge base using AI"""
        # Get relevant knowledge items
        knowledge_items = KnowledgeEntry.objects.filter(
            organization=organization
        ).order_by('-created_at')[:20]
        
        context = "\n\n".join([
            f"Title: {item.title}\nContent: {item.content}"
            for item in knowledge_items
        ])
        
        prompt = f"""Based on the following knowledge base, answer this question: {query}

Knowledge Base:
{context}

Provide a clear, concise answer based only on the information provided."""
        
        message = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return message.content[0].text
    
    def generate_insights(self, organization):
        """Generate insights from conversations and decisions"""
        conversations = Conversation.objects.filter(
            organization=organization
        ).order_by('-created_at')[:10]
        
        decisions = Decision.objects.filter(
            organization=organization
        ).order_by('-created_at')[:10]
        
        context = "Recent Conversations:\n"
        for conv in conversations:
            context += f"- {conv.title}\n"
        
        context += "\nRecent Decisions:\n"
        for dec in decisions:
            context += f"- {dec.title}: {dec.status}\n"
        
        prompt = f"""Analyze the following organizational activity and provide 3-5 key insights:

{context}

Focus on patterns, trends, and actionable recommendations."""
        
        message = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return message.content[0].text
    
    def summarize_conversation(self, conversation):
        """Generate summary of a conversation"""
        messages = conversation.messages.all().order_by('created_at')
        
        context = "\n\n".join([
            f"{msg.author.full_name}: {msg.content}"
            for msg in messages
        ])
        
        prompt = f"""Summarize this conversation in 2-3 sentences:

{context}"""
        
        message = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return message.content[0].text
