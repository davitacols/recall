"""Per-organization budgets for AI calls.

Each organization gets a monthly cap on agent run starts and copilot answer
generations. When the cap is reached, new agent runs are rejected with a
clean 402 (Payment Required) — not a 500 — so the frontend can render a
helpful "upgrade" message.

Counters live in `OrgAgentBudgetMonth` — one row per (org, year, month).
The active cap is held on `OrgAgentBudget` so admins can tune it.

Default cap: 200 agent runs / month for orgs that haven't been set up
explicitly. Configurable via env var KNOLEDGR_DEFAULT_AGENT_BUDGET.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.organizations.models import Organization


def _default_cap():
    raw = getattr(settings, "KNOLEDGR_DEFAULT_AGENT_BUDGET", 200)
    try:
        return max(0, int(raw))
    except (TypeError, ValueError):
        return 200


class OrgAgentBudget(models.Model):
    """Per-org monthly cap on agent + copilot calls."""

    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="agent_budget",
    )

    monthly_run_cap = models.PositiveIntegerField(default=_default_cap)
    monthly_copilot_cap = models.PositiveIntegerField(default=_default_cap)

    # When True, the budget is enforced. Admins can flip off temporarily.
    enforced = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "org_agent_budgets"

    def __str__(self):
        return f"AgentBudget for {self.organization_id} ({self.monthly_run_cap}/mo)"


class OrgAgentBudgetMonth(models.Model):
    """Usage counter — one row per org per (year, month)."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="agent_budget_months",
        db_index=True,
    )
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField()  # 1..12

    run_count = models.PositiveIntegerField(default=0)
    copilot_count = models.PositiveIntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "org_agent_budget_months"
        unique_together = ("organization", "year", "month")
        indexes = [
            models.Index(fields=["organization", "year", "month"]),
        ]

    def __str__(self):
        return f"BudgetMonth org={self.organization_id} {self.year}-{self.month:02d}"


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

def get_or_make_budget(org) -> OrgAgentBudget:
    budget, _ = OrgAgentBudget.objects.get_or_create(organization=org)
    return budget


def current_month_row(org) -> OrgAgentBudgetMonth:
    now = timezone.now()
    row, _ = OrgAgentBudgetMonth.objects.get_or_create(
        organization=org,
        year=now.year,
        month=now.month,
    )
    return row


def check_budget(org, kind: str = "run"):
    """Return (allowed, info) for a budget kind ('run' | 'copilot').

    `info` is a dict with `used`, `cap`, `remaining`, `enforced` so the caller
    can render a helpful message either way.
    """
    budget = get_or_make_budget(org)
    row = current_month_row(org)
    if kind == "copilot":
        used, cap = row.copilot_count, budget.monthly_copilot_cap
    else:
        used, cap = row.run_count, budget.monthly_run_cap

    info = {"used": used, "cap": cap, "remaining": max(0, cap - used), "enforced": budget.enforced}
    if not budget.enforced:
        return True, info
    return used < cap, info


def increment(org, kind: str = "run"):
    """Best-effort increment of the current-month counter."""
    from django.db.models import F
    row = current_month_row(org)
    field = "copilot_count" if kind == "copilot" else "run_count"
    OrgAgentBudgetMonth.objects.filter(pk=row.pk).update(**{field: F(field) + 1})
