"""
Seed script demonstrating unified project management system
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.organizations.models import Organization, User
from apps.agile.models import Project, Sprint, Board, Column, Issue, Blocker
from apps.decisions.models import Decision
from apps.conversations.models import Conversation
from apps.agile.models import DecisionIssueLink, ConversationIssueLink, BlockerIssueLink

# Clear existing data
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("TRUNCATE TABLE activities CASCADE")
    cursor.execute("TRUNCATE TABLE organizations CASCADE")

# Create organization
org = Organization.objects.create(
    name="TechCorp",
    slug="techcorp"
)

# Create users
alice = User.objects.create_user(
    username="alice",
    email="alice@techcorp.com",
    password="password123",
    full_name="Alice Chen",
    organization=org,
    role="admin"
)

bob = User.objects.create_user(
    username="bob",
    email="bob@techcorp.com",
    password="password123",
    full_name="Bob Smith",
    organization=org,
    role="member"
)

charlie = User.objects.create_user(
    username="charlie",
    email="charlie@techcorp.com",
    password="password123",
    full_name="Charlie Davis",
    organization=org,
    role="member"
)

# Create project
project = Project.objects.create(
    organization=org,
    name="Authentication System",
    key="AUTH",
    description="Implementing JWT-based authentication",
    lead=alice
)

# Create sprint
sprint = Sprint.objects.create(
    organization=org,
    project=project,
    name="Sprint 1: Core Auth",
    start_date=timezone.now().date(),
    end_date=timezone.now().date() + timezone.timedelta(days=14),
    goal="Implement JWT authentication and user management",
    status="active"
)

# Create board and columns
board = Board.objects.create(
    organization=org,
    project=project,
    name="Auth Board",
    board_type="kanban"
)

col_todo = Column.objects.create(board=board, name="To Do", order=0)
col_progress = Column.objects.create(board=board, name="In Progress", order=1)
col_review = Column.objects.create(board=board, name="In Review", order=2)
col_done = Column.objects.create(board=board, name="Done", order=3)

# ============================================================================
# CONVERSATION 1: JWT implementation details
# ============================================================================
conversation_jwt = Conversation.objects.create(
    organization=org,
    title="JWT implementation details",
    content="Discussing token expiration, refresh tokens, and security",
    author=alice,
    post_type="discussion"
)

# ============================================================================
# DECISION 1: Use JWT for authentication
# ============================================================================
decision_jwt = Decision.objects.create(
    organization=org,
    conversation=conversation_jwt,
    title="Use JWT for authentication",
    description="JWT tokens provide stateless authentication",
    decision_maker=alice,
    impact_level="high",
    status="approved",
    rationale="Scalable, stateless, works well with microservices"
)

# ============================================================================
# ISSUE 1: Implement JWT token generation
# ============================================================================
issue_jwt = Issue.objects.create(
    organization=org,
    project=project,
    board=board,
    column=col_progress,
    key="AUTH-1",
    title="Implement JWT token generation",
    description="Create endpoint to generate JWT tokens",
    priority="high",
    status="in_progress",
    assignee=alice,
    reporter=alice,
    sprint=sprint,
    story_points=8,
    branch_name="feature/jwt-tokens",
    pr_url="https://github.com/techcorp/auth/pull/101",
    code_review_status="approved",
    ci_status="passed",
    test_coverage=92
)

# Link Decision to Issue
DecisionIssueLink.objects.create(
    decision=decision_jwt,
    issue=issue_jwt,
    impact_type="enables"
)

# Link Conversation to Issue
ConversationIssueLink.objects.create(
    conversation=conversation_jwt,
    issue=issue_jwt
)

# ============================================================================
# ISSUE 2: Add token refresh endpoint
# ============================================================================
issue_refresh = Issue.objects.create(
    organization=org,
    project=project,
    board=board,
    column=col_progress,
    key="AUTH-2",
    title="Add token refresh endpoint",
    description="Implement refresh token mechanism",
    priority="high",
    status="in_progress",
    assignee=bob,
    reporter=alice,
    sprint=sprint,
    story_points=5,
    branch_name="feature/refresh-tokens",
    pr_url="https://github.com/techcorp/auth/pull/102",
    code_review_status="pending",
    ci_status="running",
    test_coverage=88
)

# Link Decision to Issue
DecisionIssueLink.objects.create(
    decision=decision_jwt,
    issue=issue_refresh,
    impact_type="enables"
)

# ============================================================================
# BLOCKER 1: Waiting for security review
# ============================================================================
blocker_security = Blocker.objects.create(
    organization=org,
    conversation=conversation_jwt,
    sprint=sprint,
    title="Waiting for security review",
    description="Need security team approval before merging JWT implementation",
    blocker_type="decision",
    status="active",
    blocked_by=alice,
    assigned_to=charlie
)

# Link Blocker to Issue
BlockerIssueLink.objects.create(
    blocker=blocker_security,
    issue=issue_jwt
)

# ============================================================================
# CONVERSATION 2: Redis implementation
# ============================================================================
conversation_redis = Conversation.objects.create(
    organization=org,
    title="Redis integration for token management",
    content="Discussing Redis setup, connection pooling, and TTL strategy",
    author=bob,
    post_type="discussion"
)

# ============================================================================
# DECISION 2: Use Redis for token blacklist
# ============================================================================
decision_redis = Decision.objects.create(
    organization=org,
    conversation=conversation_redis,
    title="Use Redis for token blacklist",
    description="Store revoked tokens in Redis for fast lookup",
    decision_maker=bob,
    impact_level="medium",
    status="approved",
    rationale="Redis provides O(1) lookup and automatic expiration"
)

# ============================================================================
# ISSUE 3: Implement token blacklist
# ============================================================================
issue_blacklist = Issue.objects.create(
    organization=org,
    project=project,
    board=board,
    column=col_todo,
    key="AUTH-3",
    title="Implement token blacklist with Redis",
    description="Add Redis integration for token revocation",
    priority="medium",
    status="todo",
    assignee=None,
    reporter=alice,
    sprint=sprint,
    story_points=5
)

# Link Decision to Issue
DecisionIssueLink.objects.create(
    decision=decision_redis,
    issue=issue_blacklist,
    impact_type="enables"
)

# Link Conversation to Issue
ConversationIssueLink.objects.create(
    conversation=conversation_redis,
    issue=issue_blacklist
)

# ============================================================================
# BLOCKER 2: Redis infrastructure not ready
# ============================================================================
blocker_redis = Blocker.objects.create(
    organization=org,
    conversation=conversation_redis,
    sprint=sprint,
    title="Redis infrastructure not ready",
    description="DevOps team still setting up Redis cluster",
    blocker_type="dependency",
    status="active",
    blocked_by=bob,
    assigned_to=charlie
)

# Link Blocker to Issue
BlockerIssueLink.objects.create(
    blocker=blocker_redis,
    issue=issue_blacklist
)

# ============================================================================
# ISSUE 4: User registration endpoint
# ============================================================================
issue_register = Issue.objects.create(
    organization=org,
    project=project,
    board=board,
    column=col_done,
    key="AUTH-4",
    title="User registration endpoint",
    description="Create endpoint for user registration",
    priority="high",
    status="done",
    assignee=charlie,
    reporter=alice,
    sprint=sprint,
    story_points=8,
    branch_name="feature/user-registration",
    pr_url="https://github.com/techcorp/auth/pull/99",
    code_review_status="merged",
    ci_status="passed",
    test_coverage=95
)

# ============================================================================
# CONVERSATION 3: Password security discussion
# ============================================================================
conversation_security = Conversation.objects.create(
    organization=org,
    title="Password security best practices",
    content="Discussing bcrypt vs argon2, salt rounds, and timing attacks",
    author=alice,
    post_type="discussion"
)

# ============================================================================
# DECISION 3: Use bcrypt for password hashing
# ============================================================================
decision_security = Decision.objects.create(
    organization=org,
    conversation=conversation_security,
    title="Use bcrypt for password hashing",
    description="bcrypt provides built-in salt and adaptive cost",
    decision_maker=alice,
    impact_level="high",
    status="approved",
    rationale="Industry standard, resistant to GPU attacks"
)

# ============================================================================
# ISSUE 5: Add password hashing
# ============================================================================
issue_hashing = Issue.objects.create(
    organization=org,
    project=project,
    board=board,
    column=col_review,
    key="AUTH-5",
    title="Add password hashing with bcrypt",
    description="Implement secure password hashing",
    priority="high",
    status="in_review",
    assignee=charlie,
    reporter=alice,
    sprint=sprint,
    story_points=3,
    branch_name="feature/password-hashing",
    pr_url="https://github.com/techcorp/auth/pull/103",
    code_review_status="changes_requested",
    ci_status="passed",
    test_coverage=98
)

# Link Decision to Issue
DecisionIssueLink.objects.create(
    decision=decision_security,
    issue=issue_hashing,
    impact_type="enables"
)

# Link Conversation to Issue
ConversationIssueLink.objects.create(
    conversation=conversation_security,
    issue=issue_hashing
)

# ============================================================================
# BLOCKER 3: Code review feedback
# ============================================================================
blocker_review = Blocker.objects.create(
    organization=org,
    conversation=conversation_security,
    sprint=sprint,
    title="Address code review feedback",
    description="Need to add more test cases for edge cases",
    blocker_type="technical",
    status="active",
    blocked_by=bob,
    assigned_to=charlie
)

BlockerIssueLink.objects.create(
    blocker=blocker_review,
    issue=issue_hashing
)

print("[OK] Unified system seed data created successfully!")
print("\nSummary:")
print(f"  Organization: {org.name}")
print(f"  Project: {project.name}")
print(f"  Sprint: {sprint.name}")
print(f"  Issues: 5")
print(f"  Decisions: 3")
print(f"  Conversations: 3")
print(f"  Blockers: 3")
print(f"\nLinked Relationships:")
print(f"  Decision -> Issue links: 4")
print(f"  Conversation -> Issue links: 3")
print(f"  Blocker -> Issue links: 3")
print(f"\nIssue Status Distribution:")
print(f"  To Do: 1 (AUTH-3)")
print(f"  In Progress: 2 (AUTH-1, AUTH-2)")
print(f"  In Review: 1 (AUTH-5)")
print(f"  Done: 1 (AUTH-4)")
print(f"\nView at: http://localhost:3000/projects/{project.id}/manage")
