import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation, ConversationReply, ActionItem
from apps.agile.models import Project, Sprint, Board, Column, Issue
from apps.decisions.models import Decision, Proposal

# Create organization
org, _ = Organization.objects.get_or_create(
    slug='pic2nav-inc',
    defaults={
        'name': 'Pic2Nav Inc',
        'primary_color': '#3B82F6',
    }
)

# Create users
users_data = [
    {'username': 'sarah_chen', 'first_name': 'Sarah', 'last_name': 'Chen', 'email': 'sarah@pic2nav.com', 'role': 'admin'},
    {'username': 'mike_johnson', 'first_name': 'Mike', 'last_name': 'Johnson', 'email': 'mike@pic2nav.com', 'role': 'manager'},
    {'username': 'alex_patel', 'first_name': 'Alex', 'last_name': 'Patel', 'email': 'alex@pic2nav.com', 'role': 'contributor'},
    {'username': 'emma_wilson', 'first_name': 'Emma', 'last_name': 'Wilson', 'email': 'emma@pic2nav.com', 'role': 'contributor'},
]

users = {}
for user_data in users_data:
    user, _ = User.objects.get_or_create(
        username=user_data['username'],
        organization=org,
        defaults={
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'email': user_data['email'],
            'role': user_data['role'],
            'is_active': True,
        }
    )
    users[user_data['username']] = user

now = timezone.now()

# Decision conversation
decision_conv = Conversation.objects.create(
    organization=org,
    author=users['sarah_chen'],
    post_type='decision',
    title='Adopt React Native for Mobile App Development',
    content='After evaluating multiple frameworks, we need to decide on React Native for our mobile app. It offers code reuse across iOS and Android, strong community support, and faster development cycles. The main concern is performance for graphics-heavy features, but our testing shows acceptable results.',
    priority='high',
    why_this_matters='This decision will impact our development timeline and team skill requirements for the next 12 months.',
    context_reason='We have 3 months to launch the MVP and need to choose a framework that balances speed and quality.',
    key_takeaway='React Native chosen for faster time-to-market with acceptable performance trade-offs.',
    emotional_context='consensus',
    ai_summary='Team consensus to adopt React Native for mobile development due to code reuse benefits and timeline constraints.',
    ai_keywords=['react-native', 'mobile', 'framework', 'decision'],
    ai_processed=True,
    owner=users['sarah_chen'],
)

# Create decision from conversation
Decision.objects.get_or_create(
    conversation=decision_conv,
    defaults={
        'organization': org,
        'title': decision_conv.title,
        'description': decision_conv.content,
        'rationale': 'React Native provides the best balance of development speed and cross-platform compatibility.',
        'impact_level': 'high',
        'decision_maker': users['sarah_chen'],
        'status': 'approved',
        'decided_at': now,
    }
)

# Update conversation
update = Conversation.objects.create(
    organization=org,
    author=users['mike_johnson'],
    post_type='update',
    title='Sprint 3 Progress Update - Navigation Module Complete',
    content='Great progress this week! The navigation module is now complete and integrated with the backend. All unit tests are passing. We\'re on track to finish the search functionality by end of sprint. One blocker: waiting on design team for the new UI mockups.',
    priority='medium',
    ai_summary='Sprint 3 progressing well with navigation module complete. Search functionality on track. Awaiting UI mockups from design.',
    ai_keywords=['sprint-3', 'navigation', 'progress', 'blocker'],
    ai_processed=True,
)

# Proposal conversation
proposal_conv = Conversation.objects.create(
    organization=org,
    author=users['alex_patel'],
    post_type='proposal',
    title='Implement Real-time Location Tracking Feature',
    content='I propose we add real-time location tracking to help users navigate more efficiently. This would involve integrating with Google Maps API and implementing WebSocket connections for live updates. Estimated effort: 2 sprints. Benefits: improved user experience, competitive advantage.',
    priority='high',
    alternatives_considered='Batch location updates every 30 seconds, third-party tracking service',
    tradeoffs='Real-time tracking increases server load and battery consumption on mobile devices.',
    ai_summary='Proposal to add real-time location tracking using Google Maps API and WebSockets. 2-sprint effort with UX benefits.',
    ai_keywords=['feature', 'location-tracking', 'proposal', 'api-integration'],
    ai_processed=True,
)

# Create proposal from conversation
Proposal.objects.get_or_create(
    organization=org,
    title=proposal_conv.title,
    defaults={
        'description': proposal_conv.content,
        'rationale': 'Real-time location tracking will significantly improve user experience and provide competitive advantage.',
        'proposed_by': users['alex_patel'],
        'status': 'open',
        'alternatives_considered': proposal_conv.alternatives_considered,
        'risks': proposal_conv.tradeoffs,
    }
)

# Question conversation
question = Conversation.objects.create(
    organization=org,
    author=users['emma_wilson'],
    post_type='question',
    title='How should we handle offline navigation scenarios?',
    content='Users in areas with poor connectivity need offline navigation. Should we cache map tiles locally, use a lightweight offline map library, or both? What are the storage implications?',
    priority='medium',
    ai_summary='Question about offline navigation strategy. Options: local tile caching, offline map library, or hybrid approach.',
    ai_keywords=['offline', 'navigation', 'question', 'architecture'],
    ai_processed=True,
)

# Add replies to decision
ConversationReply.objects.create(
    conversation=decision_conv,
    author=users['mike_johnson'],
    content='I agree with this decision. React Native will help us move faster. We should plan for a performance testing phase before launch.',
)

ConversationReply.objects.create(
    conversation=decision_conv,
    author=users['alex_patel'],
    content='Agreed. I\'ll start setting up the development environment and create a starter template for the team.',
)

# Add action items to decision
ActionItem.objects.create(
    conversation=decision_conv,
    title='Set up React Native development environment',
    assignee=users['alex_patel'],
    status='in_progress',
    priority='high',
    due_date=now + timedelta(days=3),
)

ActionItem.objects.create(
    conversation=decision_conv,
    title='Create project starter template',
    assignee=users['alex_patel'],
    status='pending',
    priority='high',
    due_date=now + timedelta(days=5),
)

ActionItem.objects.create(
    conversation=decision_conv,
    title='Schedule team training on React Native',
    assignee=users['sarah_chen'],
    status='pending',
    priority='medium',
    due_date=now + timedelta(days=7),
)

# Create project
project, _ = Project.objects.get_or_create(
    organization=org,
    key='P2N',
    defaults={
        'name': 'Pic2Nav Mobile App',
        'description': 'Mobile navigation application with real-time location tracking and offline support',
        'lead': users['sarah_chen'],
    }
)

# Create board
board = Board.objects.create(
    organization=org,
    project=project,
    name='Development Board',
    board_type='kanban',
)

# Create columns
columns = {}
for col_name in ['To Do', 'In Progress', 'In Review', 'Done']:
    col = Column.objects.create(
        board=board,
        name=col_name,
        order=list(['To Do', 'In Progress', 'In Review', 'Done']).index(col_name),
    )
    columns[col_name] = col

# Create sprints
sprint_active = Sprint.objects.create(
    organization=org,
    project=project,
    name='Sprint 3 - Navigation & Search',
    start_date=now.date() - timedelta(days=7),
    end_date=now.date() + timedelta(days=7),
    goal='Complete navigation module and implement search functionality',
    status='active',
    summary='Navigation module complete. Search in progress.',
    completed_count=5,
    blocked_count=1,
    decisions_made=2,
)

sprint_completed = Sprint.objects.create(
    organization=org,
    project=project,
    name='Sprint 2 - Authentication & User Profile',
    start_date=now.date() - timedelta(days=21),
    end_date=now.date() - timedelta(days=8),
    goal='Implement user authentication and profile management',
    status='completed',
    summary='All authentication features completed. User profile fully functional.',
    completed_count=8,
    blocked_count=0,
    decisions_made=1,
)

# Create issues for active sprint
issues_active = [
    {
        'title': 'Implement search algorithm',
        'description': 'Create efficient search algorithm for location names and addresses',
        'priority': 'high',
        'status': 'in_progress',
        'assignee': users['alex_patel'],
        'story_points': 5,
        'column': 'In Progress',
    },
    {
        'title': 'Add search UI component',
        'description': 'Build search input component with autocomplete suggestions',
        'priority': 'high',
        'status': 'todo',
        'assignee': users['emma_wilson'],
        'story_points': 3,
        'column': 'To Do',
    },
    {
        'title': 'Integrate Google Maps API',
        'description': 'Set up Google Maps API integration for map display',
        'priority': 'high',
        'status': 'done',
        'assignee': users['mike_johnson'],
        'story_points': 5,
        'column': 'Done',
    },
    {
        'title': 'Add route optimization',
        'description': 'Implement route optimization algorithm for multiple waypoints',
        'priority': 'medium',
        'status': 'in_review',
        'assignee': users['alex_patel'],
        'story_points': 8,
        'column': 'In Review',
    },
    {
        'title': 'Write search tests',
        'description': 'Create comprehensive unit tests for search functionality',
        'priority': 'medium',
        'status': 'todo',
        'assignee': users['emma_wilson'],
        'story_points': 3,
        'column': 'To Do',
    },
]

for idx, issue_data in enumerate(issues_active, 1):
    Issue.objects.create(
        organization=org,
        project=project,
        board=board,
        column=columns[issue_data['column']],
        key=f'P2N-{idx}',
        title=issue_data['title'],
        description=issue_data['description'],
        priority=issue_data['priority'],
        status=issue_data['status'],
        assignee=issue_data['assignee'],
        reporter=users['sarah_chen'],
        story_points=issue_data['story_points'],
        sprint=sprint_active,
        due_date=now.date() + timedelta(days=7),
    )

# Create issues for completed sprint
issues_completed = [
    {
        'title': 'Implement JWT authentication',
        'description': 'Set up JWT token-based authentication system',
        'priority': 'high',
        'status': 'done',
        'assignee': users['mike_johnson'],
        'story_points': 5,
    },
    {
        'title': 'Create user profile page',
        'description': 'Build user profile UI with edit capabilities',
        'priority': 'high',
        'status': 'done',
        'assignee': users['emma_wilson'],
        'story_points': 3,
    },
    {
        'title': 'Add password reset flow',
        'description': 'Implement password reset via email',
        'priority': 'medium',
        'status': 'done',
        'assignee': users['alex_patel'],
        'story_points': 3,
    },
    {
        'title': 'Set up user preferences',
        'description': 'Create user preferences storage and retrieval',
        'priority': 'medium',
        'status': 'done',
        'assignee': users['mike_johnson'],
        'story_points': 2,
    },
    {
        'title': 'Add profile picture upload',
        'description': 'Implement profile picture upload and storage',
        'priority': 'low',
        'status': 'done',
        'assignee': users['emma_wilson'],
        'story_points': 2,
    },
    {
        'title': 'Create user settings page',
        'description': 'Build settings page for notification and privacy preferences',
        'priority': 'medium',
        'status': 'done',
        'assignee': users['alex_patel'],
        'story_points': 3,
    },
    {
        'title': 'Implement email verification',
        'description': 'Add email verification on signup',
        'priority': 'high',
        'status': 'done',
        'assignee': users['mike_johnson'],
        'story_points': 3,
    },
    {
        'title': 'Add two-factor authentication',
        'description': 'Implement optional 2FA for enhanced security',
        'priority': 'medium',
        'status': 'done',
        'assignee': users['alex_patel'],
        'story_points': 5,
    },
]

for idx, issue_data in enumerate(issues_completed, 6):
    Issue.objects.create(
        organization=org,
        project=project,
        board=board,
        column=columns['Done'],
        key=f'P2N-{idx}',
        title=issue_data['title'],
        description=issue_data['description'],
        priority=issue_data['priority'],
        status=issue_data['status'],
        assignee=issue_data['assignee'],
        reporter=users['sarah_chen'],
        story_points=issue_data['story_points'],
        sprint=sprint_completed,
    )

print("[SUCCESS] Pic2Nav Inc data seeded successfully!")
print(f"   Organization: {org.name}")
print(f"   Users: {len(users)}")
print(f"   Conversations: 4 (1 decision, 1 update, 1 proposal, 1 question)")
print(f"   Decisions: 1 (approved)")
print(f"   Proposals: 1 (open)")
print(f"   Project: {project.name}")
print(f"   Sprints: 2 (1 active, 1 completed)")
print(f"   Issues: 13 (5 active, 8 completed)")
