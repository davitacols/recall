"""GitHub App data model.

Replaces the personal-access-token integration with a proper GitHub App
install. Each Knoledgr organization installs the Knoledgr GitHub App into
their own GitHub organization and we store the installation_id plus the
list of repos they chose to share. No long-lived tokens are persisted —
short-lived installation tokens are derived on demand from the App's
private key.

Why a separate file (not models.py): keeps the App models discoverable as
a unit and lets us roll them out without touching the legacy
GitHubIntegration model during the transition window.
"""

from __future__ import annotations

from django.db import models

from apps.organizations.models import Organization


class GitHubAppInstallation(models.Model):
    """One row per Knoledgr-organization × GitHub-account install.

    The OneToOneField on organization deliberately mirrors the legacy
    GitHubIntegration model — a Knoledgr workspace can connect to exactly
    one GitHub org install at a time. Switching workspaces between GitHub
    orgs requires uninstalling first, which is the right safety boundary.
    """

    SELECTION_ALL = "all"
    SELECTION_SELECTED = "selected"
    SELECTION_CHOICES = [
        (SELECTION_ALL, "All repositories"),
        (SELECTION_SELECTED, "Selected repositories"),
    ]

    ACCOUNT_USER = "User"
    ACCOUNT_ORG = "Organization"
    ACCOUNT_TYPE_CHOICES = [
        (ACCOUNT_USER, "User"),
        (ACCOUNT_ORG, "Organization"),
    ]

    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="github_app_installation",
    )

    # GitHub side
    installation_id = models.BigIntegerField(unique=True, db_index=True)
    account_id = models.BigIntegerField(db_index=True)
    account_login = models.CharField(max_length=128, db_index=True)
    account_type = models.CharField(
        max_length=16, choices=ACCOUNT_TYPE_CHOICES, default=ACCOUNT_ORG
    )
    account_avatar_url = models.URLField(blank=True, max_length=512)

    permissions = models.JSONField(default=dict, blank=True)
    repository_selection = models.CharField(
        max_length=16, choices=SELECTION_CHOICES, default=SELECTION_SELECTED
    )

    # Lifecycle markers (set by webhook events)
    suspended_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    # Who installed it on our side — useful for audit
    installed_by = models.ForeignKey(
        "organizations.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="github_app_installations",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "github_app_installations"
        indexes = [
            models.Index(fields=["organization", "installation_id"]),
        ]

    def __str__(self) -> str:
        return f"GitHubAppInstallation({self.account_login}, install={self.installation_id})"

    @property
    def is_active(self) -> bool:
        return self.suspended_at is None and self.revoked_at is None


class GitHubRepo(models.Model):
    """One row per repo Knoledgr has connected for a given installation.

    Stored separately from the installation so admins can enable/disable
    decision tracking per repo without re-installing, and so cross-repo
    queries (find all PRs across all our connected repos) are cheap.
    """

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="github_repos", db_index=True
    )
    installation = models.ForeignKey(
        GitHubAppInstallation,
        on_delete=models.CASCADE,
        related_name="repos",
    )

    repo_id = models.BigIntegerField(db_index=True)
    full_name = models.CharField(max_length=255, db_index=True)  # "acme/recall"
    owner_login = models.CharField(max_length=128, db_index=True)
    name = models.CharField(max_length=128)
    default_branch = models.CharField(max_length=128, blank=True)
    private = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)
    html_url = models.URLField(blank=True, max_length=512)

    # Workspace-side toggles
    is_enabled_for_decisions = models.BooleanField(default=True, db_index=True)

    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "github_repos"
        unique_together = [("organization", "repo_id")]
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["organization", "is_enabled_for_decisions"]),
            models.Index(fields=["installation", "full_name"]),
        ]

    def __str__(self) -> str:
        return self.full_name


class GitHubAppDelivery(models.Model):
    """Audit trail of every webhook the GitHub App receives.

    Mirrors the legacy GitHubWebhookDelivery but scoped by installation +
    repo so multi-repo orgs can see at a glance which repos are flowing.
    Kept separate from the legacy model so we can ship without rewriting
    the existing delivery audit during the transition.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="github_app_deliveries",
        db_index=True,
    )
    installation = models.ForeignKey(
        GitHubAppInstallation,
        on_delete=models.CASCADE,
        related_name="deliveries",
    )
    repo = models.ForeignKey(
        GitHubRepo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries",
    )

    event = models.CharField(max_length=64, db_index=True)
    action = models.CharField(max_length=64, blank=True)
    delivery_id = models.CharField(max_length=255, blank=True, db_index=True)
    signature_valid = models.BooleanField(default=False)
    status = models.CharField(max_length=24, default="received")
    summary = models.CharField(max_length=512, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "github_app_deliveries"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "-created_at"]),
            models.Index(fields=["installation", "-created_at"]),
        ]
