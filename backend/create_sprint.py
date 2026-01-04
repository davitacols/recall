from apps.agile.models import Sprint, Project
from apps.organizations.models import User
from datetime import date

user = User.objects.first()
project = Project.objects.filter(organization=user.organization).first()
if not project:
    project = Project.objects.create(organization=user.organization, name='Test Project', key='TEST')

sprint = Sprint.objects.create(
    organization=user.organization,
    project=project,
    name='Sprint 1: Auth',
    start_date=date(2026, 1, 1),
    end_date=date(2026, 1, 15),
    goal='Implement authentication'
)
print(f'Created sprint {sprint.id} in org {user.organization_id}')
