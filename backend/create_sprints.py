import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.agile.models import Project, Sprint
from apps.organizations.models import Organization
from datetime import datetime

org = Organization.objects.first()
project = Project.objects.get(id=9)

sprints_data = [
    {
        'name': 'Sprint 1 - Foundation',
        'start_date': datetime(2026, 1, 6).date(),
        'end_date': datetime(2026, 1, 20).date(),
        'goal': 'Set up core infrastructure and authentication'
    },
    {
        'name': 'Sprint 2 - Core Features',
        'start_date': datetime(2026, 1, 21).date(),
        'end_date': datetime(2026, 2, 3).date(),
        'goal': 'Implement main features and user workflows'
    },
    {
        'name': 'Sprint 3 - Polish & Testing',
        'start_date': datetime(2026, 2, 4).date(),
        'end_date': datetime(2026, 2, 18).date(),
        'goal': 'Bug fixes, performance optimization, and QA'
    }
]

for sprint_data in sprints_data:
    sprint, created = Sprint.objects.get_or_create(
        organization=org,
        project=project,
        name=sprint_data['name'],
        defaults={
            'start_date': sprint_data['start_date'],
            'end_date': sprint_data['end_date'],
            'goal': sprint_data['goal'],
            'status': 'planning'
        }
    )
    print(f"{'Created' if created else 'Exists'}: {sprint.name}")

print(f"\nTotal sprints for {project.name}: {project.sprints.count()}")
