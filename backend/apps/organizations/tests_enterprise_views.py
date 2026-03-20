from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.agile.models import Blocker, Board, Column, Issue, Project, Sprint
from apps.business.models import Task
from apps.conversations.models import Conversation
from apps.organizations.enterprise_models import (
    AccountManager,
    CompliancePolicy,
    EnterpriseIncident,
    EnterpriseIncidentEscalation,
    IncidentEscalationRule,
    InstalledMarketplaceApp,
    OnPremiseDeployment,
    ProjectPermissionScope,
    RolePermissionPolicy,
    SLAGuarantee,
    SLARule,
    SSOConfig,
    TrainingProgram,
)
from apps.organizations.models import Organization, User


class EnterpriseViewsTests(TestCase):
    def setUp(self):
        self.audit_log_patcher = patch("apps.organizations.enterprise_views.AuditLog.log", return_value=None)
        self.audit_log_patcher.start()

        self.admin_client = APIClient()
        self.manager_client = APIClient()
        self.contributor_client = APIClient()

        self.org = Organization.objects.create(name="Enterprise Org", slug="enterprise-org")
        self.admin = User.objects.create_user(
            username="enterprise_admin",
            email="admin@enterprise.test",
            password="pass1234",
            organization=self.org,
            role="admin",
            full_name="Enterprise Admin",
        )
        self.manager = User.objects.create_user(
            username="enterprise_manager",
            email="manager@enterprise.test",
            password="pass1234",
            organization=self.org,
            role="manager",
            full_name="Enterprise Manager",
        )
        self.contributor = User.objects.create_user(
            username="enterprise_contributor",
            email="contrib@enterprise.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
            full_name="Enterprise Contributor",
        )
        self.account_manager_user = User.objects.create_user(
            username="account_manager_user",
            email="am@enterprise.test",
            password="pass1234",
            organization=self.org,
            role="admin",
            full_name="Jamie Account",
        )

        self.admin_client.force_authenticate(user=self.admin)
        self.manager_client.force_authenticate(user=self.manager)
        self.contributor_client.force_authenticate(user=self.contributor)

        self.account_manager = AccountManager.objects.create(
            user=self.account_manager_user,
            phone="+1-555-0100",
            timezone="America/New_York",
            availability="Weekdays 09:00-17:00 ET",
        )
        self.account_manager.organizations.add(self.org)

        self.project = Project.objects.create(
            organization=self.org,
            name="Enterprise Platform",
            key="ENT",
            description="Enterprise delivery program",
            lead=self.admin,
        )
        self.board = Board.objects.create(
            organization=self.org,
            project=self.project,
            name="Enterprise Board",
            board_type="kanban",
        )
        self.column = Column.objects.create(board=self.board, name="In Progress", order=1)
        self.sprint = Sprint.objects.create(
            organization=self.org,
            project=self.project,
            name="Enterprise Sprint",
            start_date=timezone.now().date() - timedelta(days=3),
            end_date=timezone.now().date() + timedelta(days=7),
            status="active",
        )
        self.conversation = Conversation.objects.create(
            organization=self.org,
            author=self.admin,
            post_type="update",
            title="Enterprise rollout sync",
            content="Detailed enterprise rollout coordination update.",
            priority="high",
        )

        Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="ENT-1",
            title="Launch SSO rollout",
            description="Complete the SSO rollout.",
            status="done",
            issue_type="task",
            reporter=self.admin,
            assignee=self.manager,
            sprint=self.sprint,
            in_backlog=False,
        )
        Issue.objects.create(
            organization=self.org,
            project=self.project,
            board=self.board,
            column=self.column,
            key="ENT-2",
            title="Resolve legal review",
            description="Resolve enterprise legal review blockers.",
            status="in_progress",
            issue_type="task",
            reporter=self.admin,
            assignee=self.manager,
            sprint=self.sprint,
            in_backlog=False,
            due_date=timezone.now().date() - timedelta(days=1),
        )

        SLAGuarantee.objects.create(
            organization=self.org,
            metric="uptime",
            guaranteed_value=Decimal("99.90"),
            actual_value=Decimal("99.75"),
            period_start=timezone.now().date() - timedelta(days=30),
            period_end=timezone.now().date(),
            met=False,
            notes="Transient incident caused reduced uptime.",
        )

    def tearDown(self):
        self.audit_log_patcher.stop()

    def test_enterprise_bootstrap_endpoints_return_workspace_data(self):
        sso_response = self.admin_client.get("/api/organizations/enterprise/sso/")
        account_manager_response = self.admin_client.get("/api/organizations/enterprise/account-manager/")
        compliance_response = self.admin_client.get("/api/organizations/enterprise/compliance/")
        permissions_response = self.admin_client.get("/api/organizations/enterprise/permissions/")
        marketplace_response = self.admin_client.get("/api/organizations/enterprise/marketplace/apps/")
        featured_response = self.admin_client.get("/api/organizations/enterprise/marketplace/featured/")
        portfolio_response = self.admin_client.get("/api/organizations/enterprise/portfolio-report/")
        sla_response = self.admin_client.get("/api/organizations/enterprise/sla/")
        incidents_response = self.admin_client.get("/api/organizations/enterprise/incidents/")

        self.assertEqual(sso_response.status_code, 200)
        self.assertEqual(account_manager_response.status_code, 200)
        self.assertEqual(compliance_response.status_code, 200)
        self.assertEqual(permissions_response.status_code, 200)
        self.assertEqual(marketplace_response.status_code, 200)
        self.assertEqual(featured_response.status_code, 200)
        self.assertEqual(portfolio_response.status_code, 200)
        self.assertEqual(sla_response.status_code, 200)
        self.assertEqual(incidents_response.status_code, 200)

        self.assertEqual(account_manager_response.data["name"], "Jamie Account")
        self.assertIn("available_permissions", permissions_response.data)
        self.assertIn("default_role_permissions", permissions_response.data)
        self.assertGreaterEqual(len(marketplace_response.data), 3)
        self.assertGreaterEqual(len(featured_response.data), 3)
        self.assertEqual(portfolio_response.data["totals"]["projects"], 1)
        self.assertEqual(portfolio_response.data["totals"]["issues"], 2)
        self.assertEqual(portfolio_response.data["totals"]["completion_percent"], 50.0)
        self.assertEqual(len(sla_response.data), 1)
        self.assertEqual(incidents_response.data, [])

    def test_admin_can_manage_identity_governance_and_rollout_records(self):
        sso_response = self.admin_client.post(
            "/api/organizations/enterprise/sso/",
            {
                "provider": "okta",
                "enabled": True,
                "entity_id": "urn:enterprise:test",
                "sso_url": "https://example.com/sso",
                "auto_provision_users": True,
                "default_role": "contributor",
            },
            format="json",
        )
        compliance_response = self.admin_client.put(
            "/api/organizations/enterprise/compliance/",
            {
                "data_residency_region": "eu",
                "require_sso": True,
                "require_mfa": True,
                "audit_export_enabled": True,
                "third_party_app_approval_required": True,
                "retention_days": 730,
                "ip_allowlist": ["203.0.113.10"],
                "allowed_integrations": ["github", "slack"],
            },
            format="json",
        )
        permissions_response = self.admin_client.put(
            "/api/organizations/enterprise/permissions/",
            {
                "require_admin_approval_for_delete": True,
                "role_overrides": {
                    "admin": {"add": [], "remove": []},
                    "manager": {"add": ["manage_integrations"], "remove": ["remove_users"]},
                    "contributor": {"add": ["assign_issue"], "remove": []},
                },
            },
            format="json",
        )
        training_response = self.admin_client.post(
            "/api/organizations/enterprise/training/",
            {
                "title": "Admin Enablement",
                "description": "Enterprise admin onboarding session.",
                "training_date": timezone.now().isoformat(),
                "duration_hours": 3,
                "location": "Remote",
            },
            format="json",
        )
        on_prem_response = self.admin_client.post(
            "/api/organizations/enterprise/on-premise/",
            {
                "server_location": "Frankfurt",
                "server_specs": "8 cores / 32GB RAM",
                "database_type": "PostgreSQL",
            },
            format="json",
        )
        scope_response = self.admin_client.post(
            "/api/organizations/enterprise/permissions/project-scopes/",
            {
                "project_id": self.project.id,
                "role": "manager",
                "allowed_permissions": ["create_issue", "edit_issue"],
                "denied_permissions": ["delete_issue"],
            },
            format="json",
        )

        self.assertEqual(sso_response.status_code, 200)
        self.assertEqual(compliance_response.status_code, 200)
        self.assertEqual(permissions_response.status_code, 200)
        self.assertEqual(training_response.status_code, 201)
        self.assertEqual(on_prem_response.status_code, 201)
        self.assertEqual(scope_response.status_code, 200)

        self.assertTrue(SSOConfig.objects.filter(organization=self.org, provider="okta", enabled=True).exists())
        self.assertTrue(
            CompliancePolicy.objects.filter(
                organization=self.org,
                data_residency_region="eu",
                require_sso=True,
                require_mfa=True,
                retention_days=730,
            ).exists()
        )
        role_policy = RolePermissionPolicy.objects.get(organization=self.org)
        self.assertEqual(role_policy.role_overrides["manager"]["add"], ["manage_integrations"])
        self.assertEqual(role_policy.role_overrides["manager"]["remove"], ["remove_users"])
        self.assertTrue(TrainingProgram.objects.filter(organization=self.org, title="Admin Enablement").exists())
        self.assertTrue(OnPremiseDeployment.objects.filter(organization=self.org, server_location="Frankfurt").exists())
        self.assertTrue(
            ProjectPermissionScope.objects.filter(
                organization=self.org,
                project=self.project,
                role="manager",
            ).exists()
        )

        training = TrainingProgram.objects.get(organization=self.org, title="Admin Enablement")
        update_training_response = self.admin_client.put(
            f"/api/organizations/enterprise/training/{training.id}/",
            {
                "status": "completed",
                "materials_url": "https://example.com/materials",
                "recording_url": "https://example.com/recording",
            },
            format="json",
        )
        update_on_prem_response = self.admin_client.put(
            "/api/organizations/enterprise/on-premise/",
            {
                "status": "deployed",
                "version": "2026.03",
                "support_email": "support@enterprise.test",
                "notes": "Deployment complete",
            },
            format="json",
        )

        self.assertEqual(update_training_response.status_code, 200)
        self.assertEqual(update_on_prem_response.status_code, 200)
        training.refresh_from_db()
        on_prem = OnPremiseDeployment.objects.get(organization=self.org)
        self.assertEqual(training.status, "completed")
        self.assertEqual(on_prem.status, "deployed")
        self.assertEqual(on_prem.version, "2026.03")

    def test_admin_can_manage_marketplace_and_rule_records(self):
        apps_response = self.admin_client.get("/api/organizations/enterprise/marketplace/apps/")
        self.assertEqual(apps_response.status_code, 200)
        app_id = apps_response.data[0]["id"]

        install_response = self.admin_client.post(
            f"/api/organizations/enterprise/marketplace/apps/{app_id}/install/",
            {},
            format="json",
        )
        sla_rule_response = self.admin_client.post(
            "/api/organizations/enterprise/sla-rules/",
            {
                "name": "Uptime Watch",
                "metric": "uptime",
                "threshold_percent": 99.8,
                "lookback_days": 14,
                "severity": "high",
                "enabled": True,
                "auto_notify_admins": True,
                "auto_create_incident": True,
            },
            format="json",
        )
        escalation_rule_response = self.admin_client.post(
            "/api/organizations/enterprise/incidents/escalation-rules/",
            {
                "name": "Critical Escalation",
                "incident_type": "",
                "min_severity": "medium",
                "escalation_delay_minutes": 0,
                "create_task": True,
                "create_blocker": False,
                "notify_admins": False,
                "assign_to_role": "admin",
                "enabled": True,
            },
            format="json",
        )

        self.assertEqual(install_response.status_code, 200)
        self.assertTrue(InstalledMarketplaceApp.objects.filter(organization=self.org, app_id=app_id).exists())
        uninstall_response = self.admin_client.delete(
            f"/api/organizations/enterprise/marketplace/apps/{app_id}/uninstall/"
        )
        self.assertEqual(uninstall_response.status_code, 200)
        self.assertFalse(InstalledMarketplaceApp.objects.filter(organization=self.org, app_id=app_id).exists())

        self.assertEqual(sla_rule_response.status_code, 201)
        self.assertEqual(escalation_rule_response.status_code, 201)

        sla_rule = SLARule.objects.get(organization=self.org, name="Uptime Watch")
        escalation_rule = IncidentEscalationRule.objects.get(organization=self.org, name="Critical Escalation")

        toggle_sla_response = self.admin_client.put(
            f"/api/organizations/enterprise/sla-rules/{sla_rule.id}/",
            {"enabled": False},
            format="json",
        )
        toggle_escalation_response = self.admin_client.put(
            f"/api/organizations/enterprise/incidents/escalation-rules/{escalation_rule.id}/",
            {"enabled": False},
            format="json",
        )

        self.assertEqual(toggle_sla_response.status_code, 200)
        self.assertEqual(toggle_escalation_response.status_code, 200)
        sla_rule.refresh_from_db()
        escalation_rule.refresh_from_db()
        self.assertFalse(sla_rule.enabled)
        self.assertFalse(escalation_rule.enabled)

    def test_incident_automation_creates_incident_and_escalation_task(self):
        blocker = Blocker.objects.create(
            organization=self.org,
            conversation=self.conversation,
            sprint=self.sprint,
            title="Legal blocker",
            description="Procurement approval is still pending.",
            blocker_type="dependency",
            status="active",
            blocked_by=self.admin,
            assigned_to=self.manager,
        )
        Blocker.objects.filter(id=blocker.id).update(created_at=timezone.now() - timedelta(days=5))

        IncidentEscalationRule.objects.create(
            organization=self.org,
            name="Open incident follow-up",
            enabled=True,
            incident_type="",
            min_severity="medium",
            escalation_delay_minutes=0,
            create_task=True,
            create_blocker=False,
            notify_admins=False,
            assign_to_role="admin",
        )

        response = self.manager_client.post(
            "/api/organizations/enterprise/incidents/run-automation/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["created_count"], 1)
        incident = EnterpriseIncident.objects.get(organization=self.org, source_key=f"blocker:{blocker.id}", status="open")
        escalation = EnterpriseIncidentEscalation.objects.get(incident=incident)
        task = Task.objects.get(id=escalation.task_id)

        self.assertEqual(incident.incident_type, "blocker_spike")
        self.assertEqual(task.assigned_to, self.admin)
        self.assertIn("Escalation:", task.title)

        second_response = self.manager_client.post(
            "/api/organizations/enterprise/incidents/run-automation/",
            {},
            format="json",
        )
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(second_response.data["created_count"], 0)

    def test_contributor_cannot_mutate_enterprise_admin_controls(self):
        sso_response = self.contributor_client.post(
            "/api/organizations/enterprise/sso/",
            {"provider": "okta", "enabled": True},
            format="json",
        )
        compliance_response = self.contributor_client.put(
            "/api/organizations/enterprise/compliance/",
            {"require_sso": True},
            format="json",
        )
        install_response = self.contributor_client.post(
            "/api/organizations/enterprise/marketplace/apps/1/install/",
            {},
            format="json",
        )

        self.assertEqual(sso_response.status_code, 403)
        self.assertEqual(compliance_response.status_code, 403)
        self.assertEqual(install_response.status_code, 403)
