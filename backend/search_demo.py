"""
Interactive search demo - Try different queries
Run: python search_demo.py
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
    print(f"  SEARCHING: '{query}'")
    print('='*70)
    
    # Search conversations
    conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True
    )
    
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
        
        # Check keywords
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
    
    # Sort by score
    results.sort(key=lambda x: x['score'], reverse=True)
    
    if not results:
        print("\n  No results found")
        return
    
    print(f"\n  Found {len(results)} results:\n")
    
    for i, result in enumerate(results[:5], 1):
        print(f"  [{i}] {result['title']}")
        print(f"      Type: {result['type']}")
        print(f"      Relevance: {result['score']}/10")
        print(f"      Keywords: {', '.join(result['keywords'])}")
        print(f"      Summary: {result['summary'][:100]}...")
        print()

def main():
    print("\n" + "="*70)
    print("  RECALL KNOWLEDGE SEARCH - INTERACTIVE DEMO")
    print("="*70)
    print("\n  Try these example searches:")
    print("    1. microservices")
    print("    2. GraphQL mobile")
    print("    3. database PostgreSQL")
    print("    4. performance optimization")
    print("    5. security rate limiting")
    print("    6. React upgrade")
    print("\n" + "="*70)
    
    # Run example searches
    example_queries = [
        "microservices architecture",
        "GraphQL mobile API",
        "database connection",
        "performance image upload",
        "security"
    ]
    
    for query in example_queries:
        search_knowledge(query)
        input("\n  Press Enter to continue...")
    
    print("\n" + "="*70)
    print("  DEMO COMPLETE")
    print("="*70)
    print("\n  This is how Recall helps you find information instantly!")
    print("  Instead of searching through Slack or email for hours,")
    print("  you get relevant results in seconds.\n")

if __name__ == '__main__':
    main()
