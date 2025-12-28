from django.core.management.base import BaseCommand
from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation, ConversationReply
from apps.decisions.models import Decision

class Command(BaseCommand):
    help = 'Seed database with test data'
    
    def handle(self, *args, **options):
        # Get or create organization
        org, _ = Organization.objects.get_or_create(
            slug='pic2nav',
            defaults={'name': 'Pic2Nav'}
        )
        
        # Get or create test user
        try:
            user = User.objects.get(username='admin')
            # Update organization if needed
            if user.organization != org:
                user.organization = org
                user.save()
        except User.DoesNotExist:
            user = User.objects.create(
                username='pic2nav_admin',
                organization=org,
                email='admin@pic2nav.com',
                first_name='Admin',
                is_active=True,
                role='admin'
            )
        
        # Create test conversations
        conversations = [
            {
                'title': 'Pic2Nav Mobile App Beta Launch',
                'content': 'We are ready to launch the beta version of our mobile navigation app. The core features are complete: photo-based navigation, AR overlays, and offline maps. Need feedback on user testing results and go-to-market strategy.',
                'post_type': 'proposal',
                'priority': 'high'
            },
            {
                'title': 'Weekly Engineering Standup - Dec 27',
                'content': 'Team updates: iOS team completed camera integration, Android team fixed GPS accuracy issues, Backend team deployed new image recognition API. Next sprint: performance optimization and battery usage improvements.',
                'post_type': 'update',
                'priority': 'medium'
            },
            {
                'title': 'Image Recognition Accuracy Concerns',
                'content': 'Our current image recognition model has 78% accuracy in urban environments but drops to 65% in rural areas. Should we invest in additional training data or explore alternative ML models? This affects our Q1 launch timeline.',
                'post_type': 'question',
                'priority': 'high'
            },
            {
                'title': 'Partnership with Google Maps API',
                'content': 'Proposal to integrate Google Maps API for enhanced location services. This would improve accuracy but increase operational costs by $2000/month. Alternative is to continue with our custom mapping solution.',
                'post_type': 'proposal',
                'priority': 'medium'
            }
        ]
        
        for conv_data in conversations:
            conv, created = Conversation.objects.get_or_create(
                title=conv_data['title'],
                organization=org,
                defaults={
                    'author': user,
                    'content': conv_data['content'],
                    'post_type': conv_data['post_type'],
                    'priority': conv_data['priority'],
                    'ai_summary': f"Key discussion about {conv_data['title'].lower()}",
                    'ai_keywords': ['navigation', 'mobile', 'technology', 'product'],
                    'ai_processed': True
                }
            )
            if created:
                self.stdout.write(f'Created conversation: {conv.title}')
        
        # Create test decision linked to first conversation
        first_conversation = Conversation.objects.filter(organization=org).first()
        if first_conversation:
            decision, created = Decision.objects.get_or_create(
                title='Adopt TensorFlow for Image Recognition',
                organization=org,
                conversation=first_conversation,
                defaults={
                    'description': 'After evaluating PyTorch, TensorFlow, and OpenCV, we have decided to standardize on TensorFlow for our image recognition pipeline. This decision is based on mobile optimization, model deployment capabilities, and team expertise.',
                    'status': 'approved',
                    'impact_level': 'high',
                    'decision_maker': user,
                    'rationale': 'TensorFlow Lite provides the best performance on mobile devices and has superior deployment tools for our navigation app.'
                }
            )
            if created:
                self.stdout.write(f'Created decision: {decision.title}')
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded test data!'))