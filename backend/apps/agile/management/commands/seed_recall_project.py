from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.organizations.models import Organization, User
from apps.agile.models import Project, Sprint, Issue, Board, Column, Blocker
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

class Command(BaseCommand):
    help = 'Seed sample project data for RECALL organization'

    def handle(self, *args, **options):
        # Get or create RECALL organization
        org, created = Organization.objects.get_or_create(
            slug='recall',
            defaults={'name': 'RECALL'}
        )
        self.stdout.write(f"Organization: {org.name}")

        # Create or get admin user
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@recall.dev',
                'first_name': 'Admin',
                'last_name': 'User',
                'organization': org,
                'is_staff': True,
                'is_superuser': True
            }
        )
        admin_user.set_password('admin123')
        admin_user.save()

        # Create team members
        team_members = []
        members_data = [
            ('john', 'john@recall.dev', 'John', 'Lead'),
            ('maria', 'maria@recall.dev', 'Maria', 'Product'),
            ('alex', 'alex@recall.dev', 'Alex', 'Developer'),
            ('lisa', 'lisa@recall.dev', 'Lisa', 'QA'),
        ]

        for username, email, first_name, last_name in members_data:
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'organization': org
                }
            )
            user.set_password('password123')
            user.save()
            team_members.append(user)

        self.stdout.write(f"Created {len(team_members)} team members")

        # Create project
        project, created = Project.objects.get_or_create(
            key='RECALL',
            defaults={
                'organization': org,
                'name': 'RECALL Platform',
                'description': 'Organizational memory and decision management system',
                'lead': admin_user
            }
        )
        self.stdout.write(f"Project: {project.name}")

        # Create board
        board, _ = Board.objects.get_or_create(
            project=project,
            name='Main Board',
            defaults={
                'organization': org,
                'board_type': 'kanban'
            }
        )

        # Create columns
        column_names = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Testing', 'Done']
        columns = {}
        for i, col_name in enumerate(column_names):
            col, _ = Column.objects.get_or_create(
                board=board,
                name=col_name,
                defaults={'order': i}
            )
            columns[col_name] = col

        # Create sprint
        today = timezone.now().date()
        sprint, _ = Sprint.objects.get_or_create(
            organization=org,
            project=project,
            name='Sprint 1 - Core Features',
            defaults={
                'start_date': today,
                'end_date': today + timedelta(days=14),
                'goal': 'Implement core conversation and decision management features',
                'status': 'active'
            }
        )
        self.stdout.write(f"Sprint: {sprint.name}")

        # Create issues
        issues_data = [
            {
                'title': 'Design conversation UI',
                'description': 'Create mockups for conversation interface',
                'issue_type': 'story',
                'priority': 'high',
                'story_points': 5,
                'status': 'done',
                'assignee': team_members[1],
            },
            {
                'title': 'Implement conversation API',
                'description': 'Build REST endpoints for conversations',
                'issue_type': 'story',
                'priority': 'high',
                'story_points': 8,
                'status': 'in_review',
                'assignee': team_members[2],
                'pr_url': 'https://github.com/recall/recall/pull/42',
                'branch_name': 'feature/conversation-api',
                'code_review_status': 'pending',
            },
            {
                'title': 'Create decision tracking system',
                'description': 'Implement decision model and endpoints',
                'issue_type': 'story',
                'priority': 'high',
                'story_points': 8,
                'status': 'in_progress',
                'assignee': team_members[2],
            },
            {
                'title': 'Write API tests',
                'description': 'Unit and integration tests for all endpoints',
                'issue_type': 'task',
                'priority': 'medium',
                'story_points': 5,
                'status': 'todo',
                'assignee': team_members[3],
            },
            {
                'title': 'Setup CI/CD pipeline',
                'description': 'Configure GitHub Actions for automated testing',
                'issue_type': 'task',
                'priority': 'medium',
                'story_points': 3,
                'status': 'todo',
                'assignee': team_members[0],
            },
            {
                'title': 'Implement semantic search',
                'description': 'Add Chroma DB integration for knowledge discovery',
                'issue_type': 'story',
                'priority': 'medium',
                'story_points': 8,
                'status': 'backlog',
                'assignee': team_members[2],
            },
        ]

        created_issues = []
        for i, issue_data in enumerate(issues_data):
            status = issue_data['status']
            status_to_col = {
                'backlog': 'Backlog',
                'todo': 'To Do',
                'in_progress': 'In Progress',
                'in_review': 'In Review',
                'testing': 'Testing',
                'done': 'Done'
            }
            col_name = status_to_col.get(status, 'Backlog')
            
            issue, _ = Issue.objects.get_or_create(
                project=project,
                key=f'RECALL-{i+1}',
                defaults={
                    'organization': org,
                    'board': board,
                    'column': columns[col_name],
                    'title': issue_data['title'],
                    'description': issue_data['description'],
                    'issue_type': issue_data['issue_type'],
                    'priority': issue_data['priority'],
                    'story_points': issue_data['story_points'],
                    'status': status,
                    'assignee': issue_data.get('assignee'),
                    'reporter': admin_user,
                    'sprint': sprint if status != 'backlog' else None,
                    'in_backlog': status == 'backlog',
                    'pr_url': issue_data.get('pr_url', ''),
                    'branch_name': issue_data.get('branch_name', ''),
                    'code_review_status': issue_data.get('code_review_status', ''),
                }
            )
            created_issues.append(issue)

        self.stdout.write(f"Created {len(created_issues)} issues")

        # Create conversations
        conv1, _ = Conversation.objects.get_or_create(
            organization=org,
            title='Authentication Strategy',
            defaults={
                'author': team_members[1],
                'content': 'We need to decide between JWT vs OAuth2 for authentication. JWT is simpler but OAuth2 is more secure for third-party integrations.',
                'post_type': 'decision',
                'priority': 'high'
            }
        )

        conv2, _ = Conversation.objects.get_or_create(
            organization=org,
            title='Database Schema for Conversations',
            defaults={
                'author': team_members[0],
                'content': 'Proposed schema for storing conversations with full-text search support.',
                'post_type': 'proposal',
                'priority': 'high'
            }
        )

        self.stdout.write(f"Created 2 conversations")

        # Create decisions
        decision1, _ = Decision.objects.get_or_create(
            organization=org,
            conversation=conv1,
            title='Use JWT for Authentication',
            defaults={
                'description': 'Use JWT tokens for authentication in MVP, migrate to OAuth2 in future sprints',
                'decision_maker': team_members[1],
                'status': 'approved',
                'impact_level': 'high',
                'rationale': 'JWT is faster to implement and sufficient for MVP. OAuth2 can be added later for third-party integrations.',
                'confidence_level': 90
            }
        )

        decision2, _ = Decision.objects.get_or_create(
            organization=org,
            conversation=conv2,
            title='Use PostgreSQL with Full-Text Search',
            defaults={
                'description': 'Use PostgreSQL for conversations with built-in full-text search',
                'decision_maker': team_members[0],
                'status': 'approved',
                'impact_level': 'high',
                'rationale': 'PostgreSQL provides excellent full-text search capabilities out of the box',
                'confidence_level': 95
            }
        )

        self.stdout.write(f"Created 2 decisions")

        # Create blocker
        blocker_conv, _ = Conversation.objects.get_or_create(
            organization=org,
            title='Database Migration Blocker',
            defaults={
                'author': team_members[2],
                'content': 'Waiting for database schema finalization',
                'post_type': 'blocker',
                'priority': 'high'
            }
        )

        blocker, _ = Blocker.objects.get_or_create(
            organization=org,
            conversation=blocker_conv,
            sprint=sprint,
            title='Database schema not finalized',
            defaults={
                'description': 'Need database schema for conversations before implementing API',
                'blocker_type': 'dependency',
                'status': 'active',
                'blocked_by': team_members[2],
                'assigned_to': team_members[0],
            }
        )

        self.stdout.write(f"Created 1 blocker")

        self.stdout.write(self.style.SUCCESS('✓ Successfully seeded RECALL project data'))
        self.stdout.write(f"\nLogin credentials:")
        self.stdout.write(f"Email: admin@recall.dev")
        self.stdout.write(f"Password: admin123")
        self.stdout.write(f"\nTeam members:")
        for username, email, first_name, last_name in members_data:
            self.stdout.write(f"  {email} / password123")
