"""
Knowledge Search Demo - See how search works
Run: python quick_search_demo.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization

def search_knowledge(query):
    """Simple text-based search for demo"""
    org = Organization.objects.first()
    
    print(f"\n{'='*70}")
    print(f"  QUERY: '{query}'")
    print('='*70)
    
    conversations = Conversation.objects.filter(organization=org, ai_processed=True)
    results = []
    
    # Search in title, content, summary, and keywords
    for conv in conversations:
        score = 0
        query_lower = query.lower()
        
        if query_lower in conv.title.lower():
            score += 10
        if query_lower in conv.content.lower():
            score += 5
        if conv.ai_summary and query_lower in conv.ai_summary.lower():
            score += 7
        
        for keyword in conv.ai_keywords:
            if query_lower in keyword.lower() or keyword.lower() in query_lower:
                score += 8
        
        if score > 0:
            results.append({
                'title': conv.title,
                'type': conv.post_type,
                'summary': conv.ai_summary,
                'keywords': conv.ai_keywords[:5],
                'score': score
            })
    
    # Search decisions
    decisions = Decision.objects.filter(organization=org)
    for dec in decisions:
        score = 0
        query_lower = query.lower()
        
        if query_lower in dec.title.lower():
            score += 10
        if query_lower in dec.description.lower():
            score += 5
        if query_lower in dec.rationale.lower():
            score += 7
        
        if score > 0:
            results.append({
                'title': dec.title,
                'type': 'decision',
                'summary': dec.description,
                'keywords': [dec.impact_level, dec.status],
                'score': score
            })
    
    results.sort(key=lambda x: x['score'], reverse=True)
    
    if not results:
        print("  No results found\n")
        return
    
    print(f"\n  Found {len(results)} results:\n")
    
    for i, result in enumerate(results[:3], 1):
        print(f"  [{i}] {result['title']}")
        print(f"      Type: {result['type'].upper()}")
        print(f"      Relevance: {'*' * min(result['score'], 10)}")
        print(f"      Keywords: {', '.join(result['keywords'])}")
        print(f"      {result['summary'][:120]}...")
        print()

print("\n" + "="*70)
print("  RECALL KNOWLEDGE SEARCH DEMO")
print("="*70)

# Example searches
queries = [
    "microservices architecture",
    "GraphQL mobile",
    "database PostgreSQL",
    "performance optimization",
    "security rate limiting"
]

for query in queries:
    search_knowledge(query)

print("="*70)
print("  KEY INSIGHT")
print("="*70)
print("""
  Instead of:
    - Searching through 100+ Slack messages
    - Asking "Does anyone remember why we chose X?"
    - Losing context when people leave
  
  With Recall:
    - Type your question in natural language
    - Get relevant conversations + decisions instantly
    - Full context: reasoning, alternatives, tradeoffs
    
  Your company's memory is now searchable!
""")
