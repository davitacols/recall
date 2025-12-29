"""
Interactive demo showing how Recall's knowledge system works
Run: python demo_knowledge.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization
from apps.knowledge.search_engine import get_search_engine

def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def demo_trending_topics():
    print_section("1. TRENDING TOPICS - How It Works")
    
    org = Organization.objects.first()
    conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True
    )
    
    print(f"\nStep 1: Found {conversations.count()} AI-processed conversations")
    
    print("\nStep 2: Extracting keywords from each conversation...")
    keyword_counts = {}
    
    for conv in conversations[:3]:  # Show first 3
        print(f"\n  Conversation: {conv.title[:50]}...")
        print(f"  Keywords: {', '.join(conv.ai_keywords[:5])}")
        
        for keyword in conv.ai_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    
    print("\n  ... (processing remaining conversations)")
    
    # Process all
    for conv in conversations:
        for keyword in conv.ai_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    
    print("\nStep 3: Counting keyword frequency across all conversations...")
    trending = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    print("\nStep 4: TOP 10 TRENDING TOPICS:")
    for i, (topic, count) in enumerate(trending, 1):
        print(f"  {i}. '{topic}' - mentioned {count} times")

def demo_knowledge_search():
    print_section("2. KNOWLEDGE SEARCH - How It Works")
    
    query = "microservices architecture"
    print(f"\nSearching for: '{query}'")
    
    org = Organization.objects.first()
    
    print("\nStep 1: Converting query to vector embedding...")
    print("  (Using sentence transformers to understand meaning)")
    
    print("\nStep 2: Searching ChromaDB vector database...")
    try:
        search_engine = get_search_engine()
        results = search_engine.search(query, org.id, limit=5)
        
        print(f"\nStep 3: Found {len(results)} relevant results:")
        for i, result in enumerate(results, 1):
            print(f"\n  Result {i}:")
            print(f"    Title: {result['title']}")
            print(f"    Type: {result['content_type']}")
            print(f"    Relevance: {result['relevance_score']:.2f}")
            print(f"    Preview: {result['content_preview'][:80]}...")
    except Exception as e:
        print(f"\n  Vector search not available: {e}")
        print("  Falling back to text search...")
        
        conversations = Conversation.objects.filter(
            organization=org,
            title__icontains=query.split()[0]
        )[:3]
        
        print(f"\n  Found {conversations.count()} results:")
        for conv in conversations:
            print(f"    - {conv.title}")

def demo_decision_tracking():
    print_section("3. DECISION TRACKING - How It Works")
    
    org = Organization.objects.first()
    decisions = Decision.objects.filter(organization=org)
    
    print(f"\nStep 1: Found {decisions.count()} decisions in database")
    
    print("\nStep 2: Decisions are automatically extracted from conversations")
    print("  When someone posts a 'Decision' type conversation:")
    print("    - AI extracts the decision title")
    print("    - AI identifies the rationale")
    print("    - System tracks who decided and when")
    print("    - Impact level is recorded")
    
    print("\nStep 3: CURRENT DECISIONS:")
    for dec in decisions:
        print(f"\n  Decision: {dec.title}")
        print(f"    Status: {dec.status}")
        print(f"    Impact: {dec.impact_level}")
        print(f"    Confidence: {dec.confidence_level}/10")
        print(f"    Rationale: {dec.rationale[:80]}...")

def demo_ai_processing():
    print_section("4. AI PROCESSING - How It Works")
    
    conv = Conversation.objects.filter(ai_processed=True).first()
    
    if not conv:
        print("\nNo processed conversations found")
        return
    
    print(f"\nExample: {conv.title}")
    
    print("\n--- ORIGINAL CONTENT ---")
    print(conv.content[:200] + "...")
    
    print("\n--- AI PROCESSING STEPS ---")
    
    print("\nStep 1: AI SUMMARY (Claude extracts key points)")
    print(f"  {conv.ai_summary}")
    
    print("\nStep 2: KEYWORDS (AI identifies main topics)")
    print(f"  {', '.join(conv.ai_keywords)}")
    
    print("\nStep 3: ACTION ITEMS (AI finds tasks)")
    if conv.ai_action_items:
        for item in conv.ai_action_items[:3]:
            print(f"  - {item.get('title', 'N/A')} [{item.get('priority', 'medium')}]")
    else:
        print("  (No action items found)")
    
    print("\nStep 4: INDEXED FOR SEARCH")
    print("  Content is converted to vector embeddings")
    print("  Stored in ChromaDB for semantic search")

def demo_memory_score():
    print_section("5. MEMORY SCORE - How It Works")
    
    org = Organization.objects.first()
    
    total_conversations = Conversation.objects.filter(organization=org).count()
    ai_processed = Conversation.objects.filter(organization=org, ai_processed=True).count()
    total_decisions = Decision.objects.filter(organization=org).count()
    approved_decisions = Decision.objects.filter(organization=org, status='approved').count()
    
    print("\nStep 1: Collecting metrics...")
    print(f"  Total conversations: {total_conversations}")
    print(f"  AI processed: {ai_processed}")
    print(f"  Total decisions: {total_decisions}")
    print(f"  Approved decisions: {approved_decisions}")
    
    print("\nStep 2: Calculating scores...")
    
    decision_clarity = (approved_decisions / total_decisions * 100) if total_decisions > 0 else 0
    ai_coverage = (ai_processed / total_conversations * 100) if total_conversations > 0 else 0
    
    print(f"  Decision Clarity: {decision_clarity:.1f}% (approved/total)")
    print(f"  AI Coverage: {ai_coverage:.1f}% (processed/total)")
    
    overall_score = (decision_clarity * 0.3 + ai_coverage * 0.25) * 2
    
    print(f"\nStep 3: Overall Memory Score: {overall_score:.1f}/100")
    
    if overall_score >= 75:
        grade = "Good"
    elif overall_score >= 60:
        grade = "Fair"
    else:
        grade = "Needs Improvement"
    
    print(f"  Grade: {grade}")

def main():
    print("\n" + "=" * 70)
    print("  RECALL KNOWLEDGE SYSTEM - INTERACTIVE DEMO")
    print("=" * 70)
    print("\nThis demo shows how Recall transforms conversations into knowledge")
    
    try:
        demo_trending_topics()
        demo_knowledge_search()
        demo_decision_tracking()
        demo_ai_processing()
        demo_memory_score()
        
        print("\n" + "=" * 70)
        print("  DEMO COMPLETE")
        print("=" * 70)
        print("\nKey Takeaways:")
        print("  1. AI automatically processes every conversation")
        print("  2. Keywords are extracted and counted for trending topics")
        print("  3. Semantic search finds relevant content by meaning")
        print("  4. Decisions are tracked with full context")
        print("  5. Memory score measures organizational knowledge health")
        print("\nYour team's knowledge is now searchable and structured!")
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
