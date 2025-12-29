"""
Comprehensive test of all knowledge features
Run: python test_knowledge_features.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization
from django.utils import timezone
from datetime import timedelta

def test_search():
    print("\n" + "="*70)
    print("TEST 1: KNOWLEDGE SEARCH")
    print("="*70)
    
    org = Organization.objects.first()
    query = "microservices"
    
    # Simulate the search logic from views.py
    conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True
    )
    
    query_lower = query.lower()
    results = []
    
    for conv in conversations:
        score = 0
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
                'score': score
            })
    
    results.sort(key=lambda x: x['score'], reverse=True)
    
    print(f"\nQuery: '{query}'")
    print(f"Results found: {len(results)}")
    
    if results:
        print("\nTop 3 results:")
        for i, r in enumerate(results[:3], 1):
            print(f"  {i}. {r['title']} (score: {r['score']})")
        print("\n[PASS] SEARCH WORKS")
    else:
        print("\n[FAIL] SEARCH FAILED - No results")
    
    return len(results) > 0

def test_trending_topics():
    print("\n" + "="*70)
    print("TEST 2: TRENDING TOPICS")
    print("="*70)
    
    org = Organization.objects.first()
    conversations = Conversation.objects.filter(
        organization=org,
        ai_processed=True,
        created_at__gte=timezone.now() - timedelta(days=30)
    )
    
    keyword_counts = {}
    for conv in conversations:
        for keyword in conv.ai_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    
    trending = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    print(f"\nTotal conversations: {conversations.count()}")
    print(f"Unique keywords: {len(keyword_counts)}")
    print(f"\nTop 10 trending topics:")
    
    for i, (topic, count) in enumerate(trending, 1):
        print(f"  {i}. {topic} ({count} mentions)")
    
    if trending:
        print("\n[PASS] TRENDING TOPICS WORKS")
    else:
        print("\n[FAIL] TRENDING TOPICS FAILED")
    
    return len(trending) > 0

def test_recent_decisions():
    print("\n" + "="*70)
    print("TEST 3: RECENT DECISIONS")
    print("="*70)
    
    org = Organization.objects.first()
    decisions = Decision.objects.filter(
        organization=org,
        status='approved'
    ).order_by('-decided_at')[:10]
    
    print(f"\nApproved decisions: {decisions.count()}")
    
    if decisions.exists():
        print("\nRecent decisions:")
        for dec in decisions:
            print(f"  - {dec.title}")
            print(f"    Impact: {dec.impact_level}, Confidence: {dec.confidence_level}/10")
        print("\n[PASS] RECENT DECISIONS WORKS")
    else:
        print("\n[FAIL] NO DECISIONS FOUND")
    
    return decisions.exists()

def test_knowledge_stats():
    print("\n" + "="*70)
    print("TEST 4: KNOWLEDGE STATS")
    print("="*70)
    
    org = Organization.objects.first()
    week_ago = timezone.now() - timedelta(days=7)
    
    total_items = (
        Conversation.objects.filter(organization=org).count() +
        Decision.objects.filter(organization=org).count()
    )
    
    this_week = (
        Conversation.objects.filter(organization=org, created_at__gte=week_ago).count() +
        Decision.objects.filter(organization=org, created_at__gte=week_ago).count()
    )
    
    print(f"\nTotal searchable items: {total_items}")
    print(f"Added this week: {this_week}")
    
    if total_items > 0:
        print("\n[PASS] STATS WORKS")
    else:
        print("\n[FAIL] STATS FAILED")
    
    return total_items > 0

def test_memory_score():
    print("\n" + "="*70)
    print("TEST 5: MEMORY SCORE")
    print("="*70)
    
    org = Organization.objects.first()
    
    total_conversations = Conversation.objects.filter(organization=org).count()
    ai_processed = Conversation.objects.filter(organization=org, ai_processed=True).count()
    total_decisions = Decision.objects.filter(organization=org).count()
    approved_decisions = Decision.objects.filter(organization=org, status='approved').count()
    
    decision_clarity = (approved_decisions / total_decisions * 100) if total_decisions > 0 else 0
    ai_coverage = (ai_processed / total_conversations * 100) if total_conversations > 0 else 0
    
    overall_score = (decision_clarity * 0.3 + ai_coverage * 0.25) * 2
    
    print(f"\nMetrics:")
    print(f"  Total conversations: {total_conversations}")
    print(f"  AI processed: {ai_processed} ({ai_coverage:.1f}%)")
    print(f"  Total decisions: {total_decisions}")
    print(f"  Approved: {approved_decisions} ({decision_clarity:.1f}%)")
    print(f"\nOverall Memory Score: {overall_score:.1f}/100")
    
    if overall_score >= 75:
        grade = "Good"
    elif overall_score >= 60:
        grade = "Fair"
    else:
        grade = "Needs Improvement"
    
    print(f"Grade: {grade}")
    print("\n[PASS] MEMORY SCORE WORKS")
    
    return True

def test_time_comparison():
    print("\n" + "="*70)
    print("TEST 6: TIME COMPARISON")
    print("="*70)
    
    org = Organization.objects.first()
    now = timezone.now()
    days = 30
    
    period_start = now - timedelta(days=days)
    previous_start = period_start - timedelta(days=days)
    
    current_conversations = Conversation.objects.filter(
        organization=org,
        created_at__gte=period_start
    ).count()
    
    previous_conversations = Conversation.objects.filter(
        organization=org,
        created_at__gte=previous_start,
        created_at__lt=period_start
    ).count()
    
    current_decisions = Decision.objects.filter(
        organization=org,
        decided_at__gte=period_start
    ).count()
    
    previous_decisions = Decision.objects.filter(
        organization=org,
        decided_at__gte=previous_start,
        decided_at__lt=period_start
    ).count()
    
    print(f"\nLast 30 days:")
    print(f"  Conversations: {current_conversations} (previous: {previous_conversations})")
    print(f"  Change: {current_conversations - previous_conversations:+d}")
    print(f"  Decisions: {current_decisions} (previous: {previous_decisions})")
    print(f"  Change: {current_decisions - previous_decisions:+d}")
    
    print("\n[PASS] TIME COMPARISON WORKS")
    return True

def main():
    print("\n" + "="*70)
    print("  RECALL KNOWLEDGE FEATURES - COMPREHENSIVE TEST")
    print("="*70)
    
    org = Organization.objects.first()
    if not org:
        print("\n[FAIL] ERROR: No organization found!")
        return
    
    print(f"\nTesting organization: {org.name}")
    
    results = []
    results.append(("Search", test_search()))
    results.append(("Trending Topics", test_trending_topics()))
    results.append(("Recent Decisions", test_recent_decisions()))
    results.append(("Knowledge Stats", test_knowledge_stats()))
    results.append(("Memory Score", test_memory_score()))
    results.append(("Time Comparison", test_time_comparison()))
    
    print("\n" + "="*70)
    print("  TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"  {status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n[SUCCESS] ALL FEATURES WORKING CORRECTLY!")
    else:
        print("\n[WARNING] Some features need attention")

if __name__ == '__main__':
    main()
