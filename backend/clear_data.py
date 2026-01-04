import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.agile.models import Project, Sprint, Board, Column, Issue, IssueComment, IssueLabel, Blocker, Retrospective, SprintUpdate
from apps.conversations.models import Conversation, ConversationReply, ActionItem, Bookmark, Reaction, Badge, Document, CulturalMemory, Tag
from apps.integrations.models import GitHubIntegration, SlackIntegration, JiraIntegration

# Delete all data
print("Clearing all seeded data...\n")

Issue.objects.all().delete()
print("[OK] Deleted all issues")

IssueComment.objects.all().delete()
print("[OK] Deleted all issue comments")

IssueLabel.objects.all().delete()
print("[OK] Deleted all issue labels")

Blocker.objects.all().delete()
print("[OK] Deleted all blockers")

Retrospective.objects.all().delete()
print("[OK] Deleted all retrospectives")

SprintUpdate.objects.all().delete()
print("[OK] Deleted all sprint updates")

Sprint.objects.all().delete()
print("[OK] Deleted all sprints")

Column.objects.all().delete()
print("[OK] Deleted all columns")

Board.objects.all().delete()
print("[OK] Deleted all boards")

Project.objects.all().delete()
print("[OK] Deleted all projects")

ConversationReply.objects.all().delete()
print("[OK] Deleted all conversation replies")

ActionItem.objects.all().delete()
print("[OK] Deleted all action items")

Bookmark.objects.all().delete()
print("[OK] Deleted all bookmarks")

Reaction.objects.all().delete()
print("[OK] Deleted all reactions")

Badge.objects.all().delete()
print("[OK] Deleted all badges")

Document.objects.all().delete()
print("[OK] Deleted all documents")

CulturalMemory.objects.all().delete()
print("[OK] Deleted all cultural memories")

Conversation.objects.all().delete()
print("[OK] Deleted all conversations")

Tag.objects.all().delete()
print("[OK] Deleted all tags")

GitHubIntegration.objects.all().delete()
print("[OK] Deleted all GitHub integrations")

SlackIntegration.objects.all().delete()
print("[OK] Deleted all Slack integrations")

JiraIntegration.objects.all().delete()
print("[OK] Deleted all Jira integrations")

print("\n[SUCCESS] All seeded data cleared successfully!")
