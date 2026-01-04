from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.organizations.models import Organization, User
from apps.agile.models import Project, Sprint, Board, Column, Issue

class Command(BaseCommand):
    help = 'Seed agile data for testing'

    def handle(self, *args, **options):
        # Get or create organization
        org, _ = Organization.objects.get_or_create(name='Test Org')
        
        # Get or create user
        user, _ = User.objects.get_or_create(
            email='pm@test.com',
            defaults={'full_name': 'Project Manager', 'organization': org}
        )
        
        # Create Project
        project, created = Project.objects.get_or_create(
            key='MOBILE',
            defaults={
                'organization': org,
                'name': 'Instagram Mobile App',
                'description': 'Mobile app to scrape Instagram data',
                'lead': user
            }
        )
        
        if created:
            self.stdout.write('[+] Created Project: ' + project.name)
        
        # Create Board
        board, _ = Board.objects.get_or_create(
            project=project,
            name='Backlog',
            defaults={
                'organization': org,
                'board_type': 'kanban'
            }
        )
        
        # Create Columns
        columns_data = ['To Do', 'In Progress', 'In Review', 'Done']
        for i, col_name in enumerate(columns_data):
            Column.objects.get_or_create(
                board=board,
                name=col_name,
                defaults={'order': i}
            )
        
        # Create Sprints
        today = timezone.now().date()
        
        sprint1, created = Sprint.objects.get_or_create(
            project=project,
            name='Sprint 1: Authentication',
            defaults={
                'organization': org,
                'start_date': today,
                'end_date': today + timedelta(days=14),
                'goal': 'Implement user login and registration'
            }
        )
        if created:
            self.stdout.write('[+] Created Sprint: ' + sprint1.name)
        
        sprint2, created = Sprint.objects.get_or_create(
            project=project,
            name='Sprint 2: Data Scraping',
            defaults={
                'organization': org,
                'start_date': today + timedelta(days=15),
                'end_date': today + timedelta(days=29),
                'goal': 'Build Instagram scraper module'
            }
        )
        if created:
            self.stdout.write('[+] Created Sprint: ' + sprint2.name)
        
        # Create Issues
        to_do_col = board.columns.get(name='To Do')
        in_progress_col = board.columns.get(name='In Progress')
        done_col = board.columns.get(name='Done')
        
        issues_data = [
            {
                'title': 'Design login screen',
                'sprint': sprint1,
                'column': to_do_col,
                'status': 'todo',
                'priority': 'high'
            },
            {
                'title': 'Implement JWT authentication',
                'sprint': sprint1,
                'column': in_progress_col,
                'status': 'in_progress',
                'priority': 'highest',
                'assignee': user
            },
            {
                'title': 'Setup database schema',
                'sprint': sprint1,
                'column': done_col,
                'status': 'done',
                'priority': 'high',
                'assignee': user
            },
            {
                'title': 'Create API endpoints for auth',
                'sprint': sprint1,
                'column': to_do_col,
                'status': 'todo',
                'priority': 'high',
                'story_points': 8
            }
        ]
        
        for issue_data in issues_data:
            sprint = issue_data.pop('sprint')
            column = issue_data.pop('column')
            assignee = issue_data.pop('assignee', None)
            
            issue_key = project.key + '-' + str(project.issues.count() + 1)
            
            issue, created = Issue.objects.get_or_create(
                project=project,
                key=issue_key,
                defaults={
                    'organization': org,
                    'board': board,
                    'column': column,
                    'reporter': user,
                    'assignee': assignee,
                    'sprint': sprint,
                    **issue_data
                }
            )
            if created:
                self.stdout.write('  [+] Created Issue: ' + issue.key + ' - ' + issue.title)
        
        self.stdout.write(self.style.SUCCESS('\n[SUCCESS] Seed data created!'))
        self.stdout.write('Project: ' + project.name + ' (' + project.key + ')')
        self.stdout.write('Sprints: ' + str(project.sprints.count()))
        self.stdout.write('Issues: ' + str(project.issues.count()))
