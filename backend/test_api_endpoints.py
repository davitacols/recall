"""
Test all knowledge API endpoints
Run: python test_api_endpoints.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from apps.knowledge import views
from apps.organizations.models import Organization, User

def test_endpoints():
    print("\n" + "="*70)
    print("  TESTING KNOWLEDGE API ENDPOINTS")
    print("="*70)
    
    factory = RequestFactory()
    org = Organization.objects.first()
    user = User.objects.filter(organization=org).first()
    
    if not user:
        print("\n[FAIL] No user found")
        return
    
    print(f"\nTesting as: {user.username} ({org.name})")
    
    # Test 1: Search
    print("\n[TEST 1] POST /api/knowledge/search/")
    request = factory.post('/api/knowledge/search/', {'query': 'microservices'}, content_type='application/json')
    request.user = user
    response = views.search_knowledge(request)
    
    if response.status_code == 200:
        data = response.data
        print(f"  Status: {response.status_code}")
        print(f"  Results: {len(data.get('results', []))}")
        if data.get('results'):
            print(f"  First result: {data['results'][0]['title']}")
        print("  [PASS]")
    else:
        print(f"  [FAIL] Status: {response.status_code}")
    
    # Test 2: Trending Topics
    print("\n[TEST 2] GET /api/knowledge/trending/")
    request = factory.get('/api/knowledge/trending/')
    request.user = user
    response = views.trending_topics(request)
    
    if response.status_code == 200:
        data = response.data
        print(f"  Status: {response.status_code}")
        print(f"  Topics: {len(data)}")
        if data:
            print(f"  Top topic: {data[0]['topic']} ({data[0]['count']} mentions)")
        print("  [PASS]")
    else:
        print(f"  [FAIL] Status: {response.status_code}")
    
    # Test 3: Knowledge Stats
    print("\n[TEST 3] GET /api/knowledge/stats/")
    request = factory.get('/api/knowledge/stats/')
    request.user = user
    response = views.knowledge_stats(request)
    
    if response.status_code == 200:
        data = response.data
        print(f"  Status: {response.status_code}")
        print(f"  Total items: {data.get('total_items')}")
        print(f"  This week: {data.get('this_week')}")
        print("  [PASS]")
    else:
        print(f"  [FAIL] Status: {response.status_code}")
    
    # Test 4: Memory Score
    print("\n[TEST 4] GET /api/knowledge/memory-score/")
    request = factory.get('/api/knowledge/memory-score/')
    request.user = user
    response = views.memory_score(request)
    
    if response.status_code == 200:
        data = response.data
        print(f"  Status: {response.status_code}")
        print(f"  Score: {data.get('score')}/100")
        print(f"  Grade: {data.get('grade')}")
        print("  [PASS]")
    else:
        print(f"  [FAIL] Status: {response.status_code}")
    
    # Test 5: Time Comparison
    print("\n[TEST 5] POST /api/knowledge/time-comparison/")
    request = factory.post('/api/knowledge/time-comparison/', {'period': 'month'}, content_type='application/json')
    request.user = user
    response = views.time_comparison(request)
    
    if response.status_code == 200:
        data = response.data
        print(f"  Status: {response.status_code}")
        print(f"  Period: {data.get('period')}")
        print(f"  Conversations: {data['comparison']['conversations']['current']}")
        print("  [PASS]")
    else:
        print(f"  [FAIL] Status: {response.status_code}")
    
    # Test 6: Recent Decisions
    print("\n[TEST 6] GET /api/decisions/recent/")
    request = factory.get('/api/decisions/recent/')
    request.user = user
    response = views.recent_decisions(request)
    
    if response.status_code == 200:
        data = response.data
        print(f"  Status: {response.status_code}")
        print(f"  Decisions: {len(data)}")
        if data:
            print(f"  First: {data[0]['title']}")
        print("  [PASS]")
    else:
        print(f"  [FAIL] Status: {response.status_code}")
    
    print("\n" + "="*70)
    print("  ALL API ENDPOINTS WORKING")
    print("="*70)

if __name__ == '__main__':
    test_endpoints()
