import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation, Tag
from apps.decisions.models import Decision
from django.utils import timezone
from datetime import timedelta

def seed_ozwears():
    # Get or create organization
    org, created = Organization.objects.get_or_create(
        slug='ozwears',
        defaults={'name': 'OzWears'}
    )
    print(f"Organization: {org.name} ({'created' if created else 'exists'})")
    
    # Create users
    admin, _ = User.objects.get_or_create(
        username='admin@ozwears.com',
        organization=org,
        defaults={
            'email': 'admin@ozwears.com',
            'full_name': 'Sarah Chen',
            'role': 'admin',
            'is_staff': True
        }
    )
    admin.set_password('admin123')
    admin.save()
    
    manager, _ = User.objects.get_or_create(
        username='manager@ozwears.com',
        organization=org,
        defaults={
            'email': 'manager@ozwears.com',
            'full_name': 'James Wilson',
            'role': 'manager'
        }
    )
    manager.set_password('manager123')
    manager.save()
    
    dev, _ = User.objects.get_or_create(
        username='dev@ozwears.com',
        organization=org,
        defaults={
            'email': 'dev@ozwears.com',
            'full_name': 'Alex Kumar',
            'role': 'contributor'
        }
    )
    dev.set_password('dev123')
    dev.save()
    
    print(f"Users created: {admin.full_name}, {manager.full_name}, {dev.full_name}")
    
    # Create tags
    tags = []
    for tag_name in ['ecommerce', 'mobile-app', 'backend', 'frontend', 'performance', 'security', 'ux']:
        tag, _ = Tag.objects.get_or_create(name=tag_name, organization=org)
        tags.append(tag)
    
    # Create conversations
    conversations_data = [
        {
            'title': 'Mobile App Launch Strategy',
            'content': '''We need to finalize our mobile app launch strategy for Q1 2024.

KEY POINTS:
- Target iOS first, Android in Q2
- Focus on core shopping features
- Integration with existing web platform
- Push notifications for order updates

TIMELINE:
- Beta testing: January 2024
- Public launch: February 2024

What are everyone's thoughts on this approach?''',
            'post_type': 'proposal',
            'author': admin,
            'tags': ['mobile-app', 'ecommerce']
        },
        {
            'title': 'API Rate Limiting Implementation',
            'content': '''DECISION: Implementing rate limiting on our public API

CONTEXT:
We've seen increased API abuse from third-party scrapers affecting performance for legitimate users.

SOLUTION:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated
- Redis-based rate limiting
- Clear error messages with retry-after headers

IMPLEMENTATION:
Starting next sprint, Alex will implement using django-ratelimit.''',
            'post_type': 'decision',
            'author': manager,
            'tags': ['backend', 'security', 'performance']
        },
        {
            'title': 'Product Image Optimization',
            'content': '''Our product images are loading slowly on mobile devices.

ISSUE:
- Average image size: 2-3MB
- Mobile users experiencing 5-10 second load times
- Bounce rate increased by 15%

PROPOSED SOLUTION:
- Implement WebP format with JPEG fallback
- Lazy loading for below-fold images
- CDN caching with proper headers
- Responsive images using srcset

Need approval to proceed with implementation.''',
            'post_type': 'question',
            'author': dev,
            'tags': ['frontend', 'performance']
        },
        {
            'title': 'Q1 Sales Dashboard Launched',
            'content': '''UPDATE: New sales dashboard is now live!

FEATURES:
✓ Real-time sales metrics
✓ Product performance analytics
✓ Customer demographics
✓ Revenue forecasting

The dashboard is available at /admin/analytics

Feedback welcome!''',
            'post_type': 'update',
            'author': dev,
            'tags': ['backend', 'frontend']
        },
        {
            'title': 'Checkout Flow Redesign',
            'content': '''PROPOSAL: Simplify checkout to single-page flow

CURRENT ISSUES:
- 4-step checkout process
- 35% cart abandonment rate
- Mobile users struggling with navigation

PROPOSED CHANGES:
- Single-page checkout
- Guest checkout option
- Auto-fill shipping from billing
- Progress indicator
- Save for later feature

EXPECTED IMPACT:
- Reduce abandonment by 15-20%
- Faster checkout completion
- Better mobile experience

Looking for feedback before we start design work.''',
            'post_type': 'proposal',
            'author': manager,
            'tags': ['frontend', 'ux', 'ecommerce']
        },
        {
            'title': 'Payment Gateway Migration Complete',
            'content': '''UPDATE: Successfully migrated to Stripe

COMPLETED:
✓ All payment methods migrated
✓ Webhook integration tested
✓ Refund system working
✓ Zero downtime migration

METRICS:
- Transaction success rate: 99.2%
- Average processing time: 1.2s
- No customer complaints

Thanks to the team for the smooth migration!''',
            'post_type': 'update',
            'author': admin,
            'tags': ['backend', 'ecommerce']
        }
    ]
    
    for conv_data in conversations_data:
        tag_names = conv_data.pop('tags')
        conv, created = Conversation.objects.get_or_create(
            title=conv_data['title'],
            organization=org,
            defaults=conv_data
        )
        if created:
            for tag_name in tag_names:
                tag = Tag.objects.get(name=tag_name, organization=org)
                conv.tags.add(tag)
            print(f"Created conversation: {conv.title}")
    
    # Create decisions linked to conversations
    conv1 = Conversation.objects.filter(organization=org, title='Mobile App Launch Strategy').first()
    conv2 = Conversation.objects.filter(organization=org, title='API Rate Limiting Implementation').first()
    conv3 = Conversation.objects.filter(organization=org, title='Checkout Flow Redesign').first()
    
    decisions_data = [
        {
            'title': 'Adopt React Native for Mobile Development',
            'description': 'Use React Native framework for iOS and Android apps to maximize code reuse and speed up development.',
            'rationale': 'Team already experienced with React. Single codebase reduces maintenance. Large community support.',
            'impact_level': 'high',
            'status': 'approved',
            'decision_maker': admin,
            'conversation': conv1
        },
        {
            'title': 'Implement Redis Caching Layer',
            'description': 'Add Redis caching for product catalog and user sessions to improve performance.',
            'rationale': 'Database queries are bottleneck. Redis will reduce load and improve response times.',
            'impact_level': 'medium',
            'status': 'approved',
            'decision_maker': manager,
            'conversation': conv2
        },
        {
            'title': 'Single-Page Checkout Flow',
            'description': 'Implement single-page checkout to reduce cart abandonment.',
            'rationale': 'Current 4-step process has 35% abandonment rate. Single-page expected to reduce by 15-20%.',
            'impact_level': 'high',
            'status': 'approved',
            'decision_maker': admin,
            'conversation': conv3
        }
    ]
    
    for dec_data in decisions_data:
        dec, created = Decision.objects.get_or_create(
            title=dec_data['title'],
            organization=org,
            defaults=dec_data
        )
        if created:
            print(f"Created decision: {dec.title}")
    
    # Create some replies
    # Note: Reply model needs to be checked in the codebase
    # Skipping reply creation for now
    
    print("\nOzWears organization seeded successfully!")
    print(f"Login credentials:")
    print(f"  Admin: admin@ozwears.com / admin123")
    print(f"  Manager: manager@ozwears.com / manager123")
    print(f"  Developer: dev@ozwears.com / dev123")

if __name__ == '__main__':
    seed_ozwears()
