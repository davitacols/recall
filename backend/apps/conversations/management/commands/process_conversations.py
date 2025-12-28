from django.core.management.base import BaseCommand
from apps.conversations.models import Conversation
from apps.conversations.tasks import process_conversation_ai

class Command(BaseCommand):
    help = 'Process existing conversations with AI'

    def handle(self, *args, **options):
        conversations = Conversation.objects.filter(ai_processed=False)
        total = conversations.count()
        
        self.stdout.write(f'Processing {total} conversations...')
        
        for i, conv in enumerate(conversations, 1):
            self.stdout.write(f'[{i}/{total}] Processing: {conv.title}')
            try:
                process_conversation_ai.delay(conv.id)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed: {e}'))
        
        self.stdout.write(self.style.SUCCESS(f'Queued {total} conversations for processing'))
