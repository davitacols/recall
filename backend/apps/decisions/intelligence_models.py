"""Decision Intelligence — the moat for Knoledgr.

Most tools store decisions as static documents. We track them as living
artifacts: predicted outcomes are logged when the decision is made, reality
is observed at the milestone date, drift is calculated automatically, and
lessons learned compound across the workspace.

Models:
    DecisionPrediction    — what we expect to happen
    DecisionOutcomeCheck  — an observation of reality
    DecisionRetrospective — a formal lesson learned
    DecisionTwinRun       — a counterfactual analysis (what if we'd chosen differently)
"""

from django.db import models
from django.utils import timezone

from apps.organizations.models import Organization, User


# ----------------------------------------------------------------------------
# Predictions
# ----------------------------------------------------------------------------

class DecisionPrediction(models.Model):
    """One predicted outcome attached to a Decision.

    A decision can have multiple predictions across different dimensions
    (latency, cost, adoption, revenue, etc.). Each prediction has a target
    value with a known shape (number/percent/binary/text) so we can compute
    drift programmatically when reality lands.
    """

    METRIC_KINDS = [
        ("number", "Number"),
        ("percent", "Percent"),
        ("binary", "Yes / No"),
        ("text", "Text"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True, related_name="decision_predictions")
    decision = models.ForeignKey("decisions.Decision", on_delete=models.CASCADE, related_name="predictions")

    # Short label for what we're predicting (e.g. "latency", "adoption", "cost").
    # Free-form so teams can use whatever vocabulary they like.
    dimension = models.CharField(max_length=80)

    # Human-readable statement: "We expect to cut p95 latency by 30% by Q3".
    statement = models.TextField()

    metric_kind = models.CharField(max_length=20, choices=METRIC_KINDS, default="text")

    # Target value with a shape that matches metric_kind:
    #   number  -> {"value": 30, "unit": "ms"}
    #   percent -> {"value": 80}
    #   binary  -> {"value": true}
    #   text    -> {"value": "qualitative description"}
    target_value = models.JSONField(default=dict, blank=True)

    # Optional before-state baseline, same shape as target_value.
    baseline_value = models.JSONField(null=True, blank=True)

    # When we'll check reality. We post a "How did it go?" prompt around this date.
    check_at = models.DateField()

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="created_predictions")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "decision_predictions"
        ordering = ["check_at", "created_at"]
        indexes = [
            models.Index(fields=["organization", "check_at"]),
            models.Index(fields=["decision", "check_at"]),
        ]

    def __str__(self):
        return f"Prediction #{self.pk} on Decision #{self.decision_id}: {self.dimension}"

    @property
    def latest_check(self):
        return self.checks.order_by("-observed_at").first()


# ----------------------------------------------------------------------------
# Outcome checks (reality observations)
# ----------------------------------------------------------------------------

class DecisionOutcomeCheck(models.Model):
    """A single observation of reality against a DecisionPrediction.

    Multiple checks can be logged over time so the team can watch drift trend
    as the decision plays out, not just at the final milestone.
    """

    DRIFT_BANDS = [
        ("exceeded", "Exceeded target"),   # outperformed in a positive direction
        ("on_track", "On track"),          # within ±15%
        ("drifting", "Drifting"),          # ±15% to ±50%
        ("off_track", "Off track"),        # >±50%
        ("unknown", "Unknown"),            # text-kind or unable to compute
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    prediction = models.ForeignKey(DecisionPrediction, on_delete=models.CASCADE, related_name="checks")

    # Observed value, same shape as the prediction's target_value.
    observed_value = models.JSONField(default=dict, blank=True)

    # Signed % away from target. Positive = exceeded, negative = under.
    # Null when metric_kind is binary/text and drift can't be computed.
    drift_pct = models.FloatField(null=True, blank=True)
    drift_band = models.CharField(max_length=16, choices=DRIFT_BANDS, default="unknown", db_index=True)

    notes = models.TextField(blank=True)

    observed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="logged_outcome_checks")
    observed_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "decision_outcome_checks"
        ordering = ["-observed_at"]
        indexes = [
            models.Index(fields=["organization", "drift_band"]),
            models.Index(fields=["prediction", "-observed_at"]),
        ]

    def __str__(self):
        return f"OutcomeCheck #{self.pk} on Prediction #{self.prediction_id} ({self.drift_band})"


# ----------------------------------------------------------------------------
# Retrospectives (lessons learned)
# ----------------------------------------------------------------------------

class DecisionRetrospective(models.Model):
    """Formal lesson-learned record on a decision.

    Triggered automatically when drift hits 'off_track' or when the milestone
    date passes; can also be opened manually or by an agent.
    """

    TRIGGER_REASONS = [
        ("drift", "Drift threshold exceeded"),
        ("milestone", "Final milestone reached"),
        ("manual", "Requested manually"),
        ("agent", "Agent-initiated"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    decision = models.ForeignKey("decisions.Decision", on_delete=models.CASCADE, related_name="retrospectives")

    triggered_by = models.CharField(max_length=20, choices=TRIGGER_REASONS, default="manual")
    triggered_by_check = models.ForeignKey(
        DecisionOutcomeCheck,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="retrospectives_triggered",
    )

    summary = models.TextField(blank=True)
    root_cause = models.TextField(blank=True)
    lesson = models.TextField(blank=True)

    # Did this retro raise or lower our confidence in similar future decisions?
    # Range: -10 to +10. Used to compute decision quality scores over time.
    confidence_delta = models.IntegerField(null=True, blank=True)

    # Tags that propagate the lesson to future similar decisions.
    tags = models.JSONField(default=list, blank=True)

    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="authored_retrospectives")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "decision_retrospectives"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "-created_at"]),
            models.Index(fields=["decision", "-created_at"]),
        ]

    def __str__(self):
        return f"Retrospective #{self.pk} on Decision #{self.decision_id}"


# ----------------------------------------------------------------------------
# Twin runs (counterfactual analyses)
# ----------------------------------------------------------------------------

class DecisionTwinRun(models.Model):
    """A counterfactual analysis of a Decision: 'what if we'd chosen differently?'.

    Implemented as a thin wrapper over an AgentRun: the agent reads the
    decision, the workspace evidence around it, and produces a structured
    side-by-side narrative comparing the chosen path to the counterfactual.
    """

    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    decision = models.ForeignKey("decisions.Decision", on_delete=models.CASCADE, related_name="twin_runs")

    # The counterfactual premise. Free-form text:
    # "What if we'd chosen Vendor B instead of Vendor A?"
    # "What if we'd delayed this 6 months?"
    counterfactual_premise = models.TextField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="queued", db_index=True)

    # The agent's structured output:
    #   analysis  — narrative comparison
    #   estimated_outcomes — array of {dimension, original, counterfactual, evidence}
    #   confidence — 0-100
    analysis = models.TextField(blank=True)
    estimated_outcomes = models.JSONField(default=list, blank=True)
    confidence = models.IntegerField(null=True, blank=True)

    # Back-reference to the AgentRun that produced this twin.
    agent_run = models.ForeignKey(
        "knowledge.AgentRun",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="twin_runs",
    )

    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="requested_twin_runs")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "decision_twin_runs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "-created_at"]),
            models.Index(fields=["decision", "-created_at"]),
            models.Index(fields=["organization", "status"]),
        ]

    def __str__(self):
        return f"TwinRun #{self.pk} on Decision #{self.decision_id} ({self.status})"
