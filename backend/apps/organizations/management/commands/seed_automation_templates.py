from django.core.management.base import BaseCommand
from apps.organizations.automation_models import AutomationTemplate

class Command(BaseCommand):
    help = 'Seed automation templates'

    def handle(self, *args, **options):
        templates = [
            {
                'name': 'Auto-assign high priority issues',
                'description': 'Automatically assign high priority issues to team lead',
                'category': 'issue_management',
                'trigger_type': 'issue_created',
                'trigger_conditions': {'priority': 'high'},
                'actions': [
                    {
                        'type': 'assign_issue',
                        'config': {'assignee_id': 1}
                    }
                ]
            },
            {
                'name': 'Notify on decision lock',
                'description': 'Send notification when decision is locked',
                'category': 'decision_workflow',
                'trigger_type': 'decision_locked',
                'trigger_conditions': {},
                'actions': [
                    {
                        'type': 'send_notification',
                        'config': {'message': 'A decision has been locked'}
                    }
                ]
            },
            {
                'name': 'Auto-comment on sprint start',
                'description': 'Add comment when sprint starts',
                'category': 'sprint_planning',
                'trigger_type': 'sprint_started',
                'trigger_conditions': {},
                'actions': [
                    {
                        'type': 'create_comment',
                        'config': {'text': 'Sprint started! Good luck team!'}
                    }
                ]
            },
            {
                'name': 'Label urgent issues',
                'description': 'Add urgent label to high priority issues',
                'category': 'issue_management',
                'trigger_type': 'issue_created',
                'trigger_conditions': {'priority': 'high'},
                'actions': [
                    {
                        'type': 'add_label',
                        'config': {'label': 'urgent'}
                    }
                ]
            },
            {
                'name': 'Move issues to current sprint',
                'description': 'Automatically move new issues to current sprint',
                'category': 'sprint_planning',
                'trigger_type': 'issue_created',
                'trigger_conditions': {},
                'actions': [
                    {
                        'type': 'move_to_sprint',
                        'config': {'sprint_id': 1}
                    }
                ]
            },
        ]

        for template_data in templates:
            template, created = AutomationTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults={
                    'description': template_data['description'],
                    'category': template_data['category'],
                    'trigger_type': template_data['trigger_type'],
                    'trigger_conditions': template_data['trigger_conditions'],
                    'actions': template_data['actions'],
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created template: {template.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Template already exists: {template.name}')
                )

        self.stdout.write(self.style.SUCCESS('Automation templates seeded successfully'))
