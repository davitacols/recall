from django.core.management.base import BaseCommand
from apps.organizations.models import Organization
from apps.knowledge.search_engine import get_search_engine
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

class Command(BaseCommand):
    help = 'Index all conversations and decisions for semantic search'

    def add_arguments(self, parser):
        parser.add_argument('--org-slug', type=str, help='Index only specific organization')

    def handle(self, *args, **options):
        search_engine = get_search_engine()
        
        if options['org_slug']:
            orgs = Organization.objects.filter(slug=options['org_slug'])
        else:
            orgs = Organization.objects.all()
        
        for org in orgs:
            self.stdout.write(f'\nIndexing: {org.name}')
            
            conversations = Conversation.objects.filter(organization=org)
            self.stdout.write(f'  Conversations: {conversations.count()}')
            for conv in conversations:
                search_engine.index_conversation(conv)
            
            decisions = Decision.objects.filter(organization=org)
            self.stdout.write(f'  Decisions: {decisions.count()}')
            for decision in decisions:
                search_engine.index_decision(decision)
            
            self.stdout.write(self.style.SUCCESS(f'  Done: {org.name}'))
        
        self.stdout.write(self.style.SUCCESS('\nAll indexed!'))
