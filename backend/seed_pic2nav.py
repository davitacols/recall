"""
Seed full data for Pic2Nav organization
Run: python seed_pic2nav.py
"""

import os
import django
from datetime import datetime, timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation, ConversationReply, Tag, Badge
from apps.decisions.models import Decision

def seed_data():
    print("=" * 60)
    print("SEEDING PIC2NAV ORGANIZATION")
    print("=" * 60)
    
    # Get Pic2Nav organization
    try:
        org = Organization.objects.get(slug='pic2nav')
        print(f"\n[OK] Found organization: {org.name}")
    except Organization.DoesNotExist:
        print("\n[ERROR] Pic2Nav organization not found!")
        return
    
    # Get users
    users = list(User.objects.filter(organization=org))
    if not users:
        print("[ERROR] No users found in Pic2Nav!")
        return
    
    admin = users[0]
    print(f"[OK] Using admin: {admin.username}")
    
    # Create tags
    print("\n[1/5] Creating tags...")
    tags_data = [
        ('architecture', '#000000'),
        ('backend', '#1F2937'),
        ('frontend', '#3B82F6'),
        ('database', '#10B981'),
        ('security', '#EF4444'),
        ('performance', '#F59E0B'),
        ('api', '#8B5CF6'),
        ('mobile', '#EC4899'),
    ]
    
    tags = []
    for name, color in tags_data:
        tag, created = Tag.objects.get_or_create(
            name=name,
            organization=org,
            defaults={'color': color, 'usage_count': 0}
        )
        tags.append(tag)
        print(f"  {'Created' if created else 'Found'}: #{name}")
    
    # Create conversations
    print("\n[2/5] Creating conversations...")
    
    conversations_data = [
        {
            'title': 'Architecture Decision: Microservices vs Monolith',
            'content': '''Team discussed whether to adopt microservices architecture for our new mobile app backend.

DECISION: We're going with microservices.

REASONING:
- Team is scaling to 15 developers
- Need independent deployment cycles
- Different services have different scaling needs
- Want to use different tech stacks per service

ALTERNATIVES CONSIDERED:
1. Monolith - Too limiting as team grows
2. Modular monolith - Middle ground but still single deployment
3. Microservices - Chosen for flexibility

TRADEOFFS:
- Gain: Team autonomy, independent scaling, tech flexibility
- Cost: Increased complexity, distributed system challenges, more DevOps overhead

CONFIDENCE: Medium (7/10)
- Team has some microservices experience
- Will need to invest in observability
- Risk of over-engineering early on''',
            'post_type': 'decision',
            'priority': 'high',
            'context_reason': 'Mobile app user base growing 50% monthly, current monolith becoming bottleneck',
            'key_takeaway': 'Adopting microservices for team autonomy and independent scaling',
            'emotional_context': 'risky',
            'alternatives_considered': 'Monolith: Too limiting\nModular monolith: Still single deployment\nMicroservices: Chosen for flexibility',
            'tradeoffs': 'Complexity vs Scalability. More DevOps work but better team autonomy.',
            'tags': ['architecture', 'backend'],
        },
        {
            'title': 'API Design: REST vs GraphQL for Mobile',
            'content': '''Mobile team needs a new API. Discussed REST vs GraphQL.

DECISION: GraphQL with Apollo Client

WHY:
- Mobile screens have very different data needs
- Want to avoid over-fetching
- Single endpoint simplifies mobile networking
- Strong typing helps catch errors early

CONCERNS:
- Team learning curve (2-3 weeks)
- Caching complexity
- N+1 query problems

MITIGATION:
- Start with Apollo tutorials
- Use DataLoader for batching
- Monitor query performance closely

IMPLEMENTATION:
- Week 1-2: Team training
- Week 3: Build first schema
- Week 4: Mobile integration
- Week 5: Performance tuning''',
            'post_type': 'proposal',
            'priority': 'high',
            'context_reason': 'Mobile app needs flexible data fetching, REST endpoints becoming too numerous',
            'key_takeaway': 'GraphQL chosen for flexible mobile queries despite learning curve',
            'emotional_context': 'experimental',
            'alternatives_considered': 'REST: Too many endpoints\nGraphQL: Flexible but complex\nBFF Pattern: Considered but adds layer',
            'tradeoffs': 'Learning curve vs Flexibility. Team needs training but mobile gets better UX.',
            'tags': ['api', 'mobile', 'backend'],
        },
        {
            'title': 'Bug Postmortem: Database Connection Pool Exhaustion',
            'content': '''INCIDENT: Production outage for 2 hours on Dec 15, 2024

IMPACT:
- All API requests failing
- 50,000 users affected
- $10K estimated revenue loss

ROOT CAUSE:
Connection leak in payment service. Connections not being returned to pool after failed transactions.

WHY IT WASN'T CAUGHT:
- No connection pool monitoring
- Load testing didn't simulate payment failures
- Staging environment has smaller pool (didn't hit limit)

THE FIX:
- Added explicit connection.close() in finally blocks
- Implemented connection pool monitoring
- Added alerts at 80% pool usage
- Updated load tests to include failure scenarios

PREVENTION:
- Code review checklist now includes resource cleanup
- Added connection leak detection in CI
- Staging pool size now matches production

LESSONS LEARNED:
- Monitor ALL resource pools
- Test failure scenarios, not just happy path
- Staging should mirror production config''',
            'post_type': 'update',
            'priority': 'urgent',
            'context_reason': 'Production outage affecting all users, need to document for future prevention',
            'key_takeaway': 'Connection leak caused outage, fixed with proper cleanup and monitoring',
            'emotional_context': 'urgent',
            'tags': ['database', 'backend', 'performance'],
        },
        {
            'title': 'Performance: Image Upload Optimization',
            'content': '''PROBLEM: Image uploads taking 5-10 seconds, users complaining

INVESTIGATION:
- Profiled upload endpoint
- Found: Processing images synchronously
- Resizing 3 versions (thumbnail, medium, large) before responding
- Each resize taking 2-3 seconds

SOLUTION: Async processing with job queue

IMPLEMENTATION:
1. Upload returns immediately with "processing" status
2. Celery worker handles resizing in background
3. WebSocket notifies client when done
4. Fallback to polling for older clients

RESULTS:
- Upload response time: 5-10s → 200ms (96% improvement)
- User satisfaction up 40%
- Server CPU usage down 30%

TRADEOFFS:
- Added complexity (job queue, WebSocket)
- Slightly delayed image availability (1-2s)
- Users love the instant feedback

MONITORING:
- Track job queue length
- Alert if processing time > 5s
- Monitor WebSocket connection health''',
            'post_type': 'update',
            'priority': 'medium',
            'context_reason': 'User complaints about slow uploads, impacting user experience',
            'key_takeaway': 'Moved image processing to background, 96% faster uploads',
            'tags': ['performance', 'backend'],
        },
        {
            'title': 'Security: Implementing Rate Limiting',
            'content': '''PROPOSAL: Add rate limiting to all public APIs

MOTIVATION:
- Recent bot attack consumed 80% of API capacity
- No protection against credential stuffing
- Potential for DDoS attacks

PROPOSED SOLUTION:
- Redis-based rate limiting
- Tiered limits: Anonymous (10/min), Authenticated (100/min), Premium (1000/min)
- Per-IP and per-user tracking
- Exponential backoff for repeated violations

IMPLEMENTATION PLAN:
1. Add Redis to infrastructure
2. Implement middleware
3. Add rate limit headers to responses
4. Update API documentation
5. Monitor and tune limits

CONCERNS:
- Legitimate users might hit limits
- Need good error messages
- Redis becomes critical dependency

MITIGATION:
- Start with generous limits
- Clear error messages with retry-after
- Redis cluster for high availability
- Fallback to in-memory if Redis down''',
            'post_type': 'proposal',
            'priority': 'high',
            'context_reason': 'Recent bot attack exposed lack of rate limiting, security vulnerability',
            'key_takeaway': 'Adding Redis-based rate limiting to prevent abuse and attacks',
            'emotional_context': 'risky',
            'tags': ['security', 'backend', 'api'],
        },
        {
            'title': 'Frontend: Migrating to React 18',
            'content': '''DECISION: Upgrade from React 17 to React 18

BENEFITS:
- Automatic batching (better performance)
- Concurrent rendering
- Suspense improvements
- Better TypeScript support

MIGRATION PLAN:
- Week 1: Update dependencies, test in dev
- Week 2: Fix breaking changes (mostly ReactDOM.render)
- Week 3: Gradual rollout with feature flags
- Week 4: Full production deployment

BREAKING CHANGES:
- ReactDOM.render → createRoot
- Automatic batching (might expose bugs)
- Stricter hydration warnings

RISK ASSESSMENT:
- Low risk: React team provides good migration guide
- Main concern: Third-party library compatibility
- Mitigation: Test all major libraries first

ROLLBACK PLAN:
- Keep React 17 branch for 2 weeks
- Can revert via feature flag
- Database changes not required''',
            'post_type': 'decision',
            'priority': 'medium',
            'context_reason': 'React 18 offers performance improvements, staying current with ecosystem',
            'key_takeaway': 'Upgrading to React 18 for performance and concurrent rendering',
            'tags': ['frontend'],
        },
        {
            'title': 'Database: PostgreSQL vs MySQL Decision',
            'content': '''CONTEXT: Choosing database for new analytics service

DECISION: PostgreSQL

REASONING:
- Better JSON support (JSONB)
- Advanced indexing (GiST, GIN)
- Full-text search built-in
- Better for complex queries
- Strong ACID compliance

ALTERNATIVES:
- MySQL: Familiar but limited JSON support
- MongoDB: Good for JSON but weak transactions
- PostgreSQL: Best balance for our needs

TRADEOFFS:
- Team needs to learn PostgreSQL (1-2 weeks)
- Slightly more complex setup
- Better long-term capabilities

MIGRATION PLAN:
- Start with new analytics service
- Evaluate for 3 months
- Consider migrating other services if successful

CONFIDENCE: High (8/10)''',
            'post_type': 'decision',
            'priority': 'high',
            'context_reason': 'New analytics service needs robust database with JSON support',
            'key_takeaway': 'PostgreSQL chosen for advanced features and JSON support',
            'tags': ['database', 'backend'],
        },
        {
            'title': 'Sprint Planning: Q1 2025 Priorities',
            'content': '''SPRINT GOALS:
1. Complete microservices migration (3 services)
2. Launch GraphQL API beta
3. Implement rate limiting
4. React 18 upgrade

TEAM CAPACITY:
- 5 backend developers
- 3 frontend developers
- 1 DevOps engineer
- 2 QA engineers

DEPENDENCIES:
- Microservices needs DevOps support
- GraphQL needs mobile team coordination
- Rate limiting blocks public API launch

RISKS:
- Microservices might take longer than estimated
- Holiday season (reduced capacity)
- External vendor delays possible

MITIGATION:
- Buffer time in estimates
- Prioritize rate limiting (security critical)
- GraphQL can slip to Q2 if needed''',
            'post_type': 'update',
            'priority': 'medium',
            'context_reason': 'Q1 planning to align team on priorities and manage dependencies',
            'key_takeaway': 'Q1 focused on microservices, GraphQL, and security improvements',
            'tags': ['architecture', 'backend', 'frontend'],
        },
    ]
    
    conversations = []
    for i, conv_data in enumerate(conversations_data, 1):
        tag_names = conv_data.pop('tags', [])
        conv = Conversation.objects.create(
            organization=org,
            author=admin,
            **conv_data,
            created_at=timezone.now() - timedelta(days=len(conversations_data) - i)
        )
        
        # Add tags
        for tag_name in tag_names:
            tag = next((t for t in tags if t.name == tag_name), None)
            if tag:
                conv.tags.add(tag)
                tag.usage_count += 1
                tag.save()
        
        conversations.append(conv)
        print(f"  Created: {conv.title[:50]}...")
    
    # Create replies
    print("\n[3/5] Creating replies...")
    replies_data = [
        (0, "Great analysis! I agree microservices is the right call. We should start with the payment service as it's the most isolated."),
        (0, "Concerned about the DevOps overhead. Do we have enough infrastructure expertise?"),
        (1, "GraphQL is powerful but the learning curve is real. Let's budget 3 weeks for team training, not 2."),
        (2, "This was a tough incident. Thanks for the thorough postmortem. The monitoring improvements are crucial."),
        (3, "Impressive results! Can we apply the same async pattern to video uploads?"),
        (4, "Rate limiting is essential. Let's make sure we have good documentation for API consumers."),
        (5, "React 18 upgrade should be smooth. I've done this on another project. Happy to help."),
    ]
    
    for conv_idx, content in replies_data:
        ConversationReply.objects.create(
            conversation=conversations[conv_idx],
            author=admin,
            content=content,
            created_at=timezone.now() - timedelta(hours=12)
        )
        conversations[conv_idx].reply_count += 1
        conversations[conv_idx].save()
        print(f"  Added reply to: {conversations[conv_idx].title[:40]}...")
    
    # Create decisions
    print("\n[4/5] Creating decisions...")
    decisions_data = [
        {
            'conversation': conversations[0],
            'title': 'Adopt Microservices Architecture',
            'description': 'Transition from monolith to microservices for scalability and team autonomy',
            'rationale': 'Team scaling, need independent deployments, different scaling needs per service',
            'impact_level': 'critical',
            'status': 'approved',
            'context_reason': 'Mobile app growth requires architectural change',
            'if_this_fails': 'Can consolidate services back into modular monolith. Keep monolith running for 6 months as fallback.',
            'confidence_level': 7,
            'confidence_votes': [
                {'user_id': admin.id, 'user_name': admin.get_full_name(), 'vote': 7, 'timestamp': timezone.now().isoformat()},
            ],
        },
        {
            'conversation': conversations[1],
            'title': 'Use GraphQL for Mobile API',
            'description': 'Implement GraphQL API with Apollo Client for mobile applications',
            'rationale': 'Flexible data fetching, single endpoint, strong typing, better mobile UX',
            'impact_level': 'high',
            'status': 'under_review',
            'context_reason': 'Mobile app needs flexible data fetching',
            'if_this_fails': 'Fall back to REST API with BFF pattern. GraphQL can be optional endpoint.',
            'confidence_level': 6,
        },
        {
            'conversation': conversations[6],
            'title': 'Migrate to PostgreSQL',
            'description': 'Use PostgreSQL for new analytics service',
            'rationale': 'Better JSON support, advanced indexing, full-text search, complex queries',
            'impact_level': 'high',
            'status': 'approved',
            'context_reason': 'Analytics service needs robust JSON and query capabilities',
            'if_this_fails': 'Can switch to MySQL if PostgreSQL proves too complex. Data migration plan exists.',
            'confidence_level': 8,
        },
    ]
    
    for dec_data in decisions_data:
        decision = Decision.objects.create(
            organization=org,
            decision_maker=admin,
            decided_at=timezone.now() - timedelta(days=5),
            **dec_data
        )
        print(f"  Created: {decision.title}")
    
    # Create badges
    print("\n[5/5] Creating badges...")
    Badge.objects.create(
        user=admin,
        badge_type='decision_owner',
        conversation=conversations[0],
        earned_at=timezone.now() - timedelta(days=3)
    )
    Badge.objects.create(
        user=admin,
        badge_type='knowledge_builder',
        conversation=conversations[2],
        earned_at=timezone.now() - timedelta(days=2)
    )
    print(f"  Created 2 badges for {admin.username}")
    
    # Update stats
    print("\n[STATS] Updating conversation stats...")
    for conv in conversations:
        conv.view_count = 15 + (hash(conv.title) % 50)
        conv.save()
    
    print("\n" + "=" * 60)
    print("[SUCCESS] SEEDING COMPLETE")
    print("=" * 60)
    print(f"\nCreated:")
    print(f"  - {len(tags)} tags")
    print(f"  - {len(conversations)} conversations")
    print(f"  - {len(replies_data)} replies")
    print(f"  - {len(decisions_data)} decisions")
    print(f"  - 2 badges")
    print(f"\nOrganization: {org.name}")
    print(f"User: {admin.username}")
    print("\nYou can now test all features in the frontend!")

if __name__ == '__main__':
    seed_data()
