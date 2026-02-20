import os
import json
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core import serializers
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.models import KnowledgeArticle
from apps.business.models import Goal, Meeting, Task
from apps.business.document_models import Document
from apps.organizations.models import Organization

class Command(BaseCommand):
    help = 'Create daily backup of all data'

    def handle(self, *args, **options):
        backup_dir = os.path.join('backups', datetime.now().strftime('%Y-%m-%d'))
        os.makedirs(backup_dir, exist_ok=True)

        # Backup each model
        models = [
            ('organizations', Organization),
            ('conversations', Conversation),
            ('decisions', Decision),
            ('knowledge', KnowledgeArticle),
            ('goals', Goal),
            ('meetings', Meeting),
            ('tasks', Task),
            ('documents', Document),
        ]

        for name, model in models:
            data = serializers.serialize('json', model.objects.all())
            filepath = os.path.join(backup_dir, f'{name}.json')
            with open(filepath, 'w') as f:
                f.write(data)
            self.stdout.write(f'Backed up {name}: {model.objects.count()} records')

        self.stdout.write(self.style.SUCCESS(f'Backup completed: {backup_dir}'))
