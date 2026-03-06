from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User
from .models import (
    Blocker,
    BlockerIssueLink,
    Board,
    Column,
    DecisionImpact,
    DecisionIssueLink,
    Issue,
    IssueDecisionHistory,
    Project,
    Sprint,
)
from .retrospective_endpoints import auto_generate_retrospective
from .views import link_decision_to_issue


class AgilePhase2BehaviorTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.org = Organization.objects.create(name='Org', slug='org')
        self.user = User.objects.create_user(
            username='phase2-user',
            email='phase2-user@example.com',
            password='pass',
            organization=self.org,
            role='admin',
        )
        self.project = Project.objects.create(
            organization=self.org,
            name='Project',
            key='PH2',
            lead=self.user,
        )
        self.board = Board.objects.create(
            organization=self.org,
            project=self.project,
            name='Board',
        )
        self.column = Column.objects.create(board=self.board, name='To Do', order=1)
        self.sprint = Sprint.objects.create(
            organization=self.org,
            project=self.project,
            name='Sprint 1',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=14),
            status='active',
        )
        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.user,
            post_type='decision',
            title='Decision context',
            content='Decision context content for testing.',
        )
        self.decision = Decision.objects.create(
            organization=self.org,
            conversation=self.conversation,
            title='Delay impacting decision',
            description='A decision that introduces delay to linked work.',
            decision_maker=self.user,
            rationale='Need to sequence dependent work later.',
        )

    def _create_issue(self, key, due_date, **overrides):
        defaults = {
            'organization': self.org,
            'project': self.project,
            'board': self.board,
            'column': self.column,
            'key': key,
            'title': f'Issue {key}',
            'reporter': self.user,
            'status': 'todo',
            'sprint': self.sprint,
            'due_date': due_date,
        }
        defaults.update(overrides)
        return Issue.objects.create(**defaults)

    def test_link_decision_delay_propagates_across_dependency_graph(self):
        root = self._create_issue('PH2-1', date.today() + timedelta(days=1))
        subtask = self._create_issue(
            'PH2-2',
            date.today() + timedelta(days=2),
            parent_issue=root,
            issue_type='subtask',
        )
        blocker_peer = self._create_issue('PH2-3', date.today() + timedelta(days=3))
        decision_linked = self._create_issue('PH2-4', date.today() + timedelta(days=4))
        decision_impacted = self._create_issue('PH2-5', date.today() + timedelta(days=5))

        blocker = Blocker.objects.create(
            organization=self.org,
            conversation=self.conversation,
            sprint=self.sprint,
            title='Shared blocker',
            description='Both issues are blocked by the same dependency.',
            blocker_type='dependency',
            blocked_by=self.user,
            status='active',
        )
        BlockerIssueLink.objects.create(blocker=blocker, issue=root)
        BlockerIssueLink.objects.create(blocker=blocker, issue=blocker_peer)
        DecisionIssueLink.objects.create(decision=self.decision, issue=decision_linked, impact_type='blocks')
        DecisionImpact.objects.create(
            organization=self.org,
            decision=self.decision,
            issue=decision_impacted,
            impact_type='delays',
            description='Known related delay',
            estimated_delay_days=1,
            created_by=self.user,
        )

        request = self.factory.post(
            f'/api/agile/issues/{root.id}/link-decision/',
            {
                'decision_id': self.decision.id,
                'impact_type': 'blocks',
                'estimated_delay_days': 3,
                'description': 'Decision introduced delay',
            },
            format='json',
        )
        force_authenticate(request, user=self.user)
        response = link_decision_to_issue(request, root.id)

        self.assertEqual(response.status_code, 201)
        self.assertGreaterEqual(response.data['timeline_adjustments']['issues_shifted'], 5)
        self.assertEqual(response.data['timeline_adjustments']['delay_days_applied'], 3)

        root.refresh_from_db()
        subtask.refresh_from_db()
        blocker_peer.refresh_from_db()
        decision_linked.refresh_from_db()
        decision_impacted.refresh_from_db()

        self.assertEqual(root.due_date, date.today() + timedelta(days=4))
        self.assertEqual(subtask.due_date, date.today() + timedelta(days=5))
        self.assertEqual(blocker_peer.due_date, date.today() + timedelta(days=6))
        self.assertEqual(decision_linked.due_date, date.today() + timedelta(days=7))
        self.assertEqual(decision_impacted.due_date, date.today() + timedelta(days=8))

        self.assertTrue(
            IssueDecisionHistory.objects.filter(
                issue=blocker_peer,
                reason__icontains='shared blocker',
            ).exists()
        )
        self.assertTrue(
            IssueDecisionHistory.objects.filter(
                issue=decision_linked,
                reason__icontains='decision link',
            ).exists()
        )

    def test_auto_generate_retrospective_sums_story_points_without_crashing(self):
        Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key='PH2-6',
            title='Done issue 1',
            reporter=self.user,
            status='done',
            sprint=self.sprint,
            story_points=5,
        )
        Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key='PH2-7',
            title='Done issue 2',
            reporter=self.user,
            status='done',
            sprint=self.sprint,
            story_points=3,
        )

        request = self.factory.post(f'/api/agile/sprints/{self.sprint.id}/auto-retrospective/')
        force_authenticate(request, user=self.user)
        response = auto_generate_retrospective(request, self.sprint.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['summary']['story_points_completed'], 8)
        self.assertEqual(response.data['summary']['completed'], 2)
