import logging

from celery import shared_task
from django.utils import timezone

from .models import Decision

logger = logging.getLogger(__name__)


@shared_task
def check_decision_reminders():
    """Check and mark decisions that need reminders"""
    decisions = Decision.objects.filter(
        reminder_enabled=True,
        status='approved'
    )
    
    reminded_count = 0
    for decision in decisions:
        if decision.needs_reminder:
            decision.last_reminded_at = timezone.now()
            decision.save()
            reminded_count += 1
    
    return f"Reminded {reminded_count} decisions"


# ----------------------------------------------------------------------------
# Decision Intelligence — passive drift detection
# ----------------------------------------------------------------------------

@shared_task(name='apps.decisions.tasks.decision_intelligence_sweep')
def decision_intelligence_sweep():
    """Daily sweep over Decision Intelligence records.

    Surfaces two passive signals that need human attention:

    1. **Overdue predictions** — a prediction's `check_at` date has passed and
       no `DecisionOutcomeCheck` has been logged within the last 14 days. We
       notify the decision_maker (and stakeholders) so reality can be recorded
       while the context is fresh.

    2. **Drifted decisions without retros** — a decision has at least one
       `off_track` outcome check and no retrospective triggered by that check.
       This guarantees every drift eventually produces a lesson, instead of
       quietly fading into history.

    Returns a summary dict so the celery beat output is auditable.
    """
    from datetime import timedelta
    from django.utils import timezone

    from apps.decisions.intelligence_models import (
        DecisionOutcomeCheck,
        DecisionPrediction,
        DecisionRetrospective,
    )
    from apps.notifications.utils import create_notification

    now = timezone.now()
    today = now.date()
    stale_cutoff = now - timedelta(days=14)

    overdue_count = 0
    drifted_followup_count = 0
    errors = 0

    # ---- 1) Overdue predictions ----
    # Exclude predictions whose check_at hasn't arrived yet, and those that
    # have a recent observation (last 14 days). The remainder are the ones
    # where reality should have been recorded by now but wasn't.
    overdue_predictions = (
        DecisionPrediction.objects
        .filter(check_at__lte=today)
        .exclude(checks__observed_at__gte=stale_cutoff)
        .select_related("decision", "decision__decision_maker", "organization")
    )

    # Don't spam: only nudge once per overdue prediction per 7-day window.
    nudged_recent_window_start = now - timedelta(days=7)

    for prediction in overdue_predictions.iterator():
        decision = prediction.decision
        if not decision:
            continue

        # Skip if we notified about this prediction in the last 7 days.
        recently_nudged = (
            DecisionOutcomeCheck.objects
            .filter(prediction=prediction, observed_at__gte=nudged_recent_window_start)
            .exists()
        )
        if recently_nudged:
            continue

        recipients = _drift_recipients(decision)
        days_overdue = (today - prediction.check_at).days
        title = f"Outcome check overdue: {decision.title}"
        message = (
            f"The prediction \"{prediction.statement}\" was due on "
            f"{prediction.check_at.isoformat()} ({days_overdue} day"
            f"{'s' if days_overdue != 1 else ''} ago). Log what actually "
            f"happened so the workspace can compound the lesson."
        )
        link = f"/decisions/{decision.id}"
        for user in recipients:
            try:
                create_notification(user=user, notification_type="reminder",
                                    title=title, message=message, link=link)
                overdue_count += 1
            except Exception as exc:
                logger.warning("decision_intelligence_sweep: notify failed for user=%s: %s", user.id, exc)
                errors += 1

    # ---- 2) Drifted decisions with no retro yet ----
    # Any off_track check whose triggered_by_check ID isn't on a retrospective
    # for the same decision is a gap. The view layer auto-opens retros for new
    # off_track checks, but historical data (or check-by-tool flows) may have
    # left some uncovered.
    drifted_checks = (
        DecisionOutcomeCheck.objects
        .filter(drift_band="off_track")
        .select_related("prediction", "prediction__decision", "prediction__decision__decision_maker", "organization")
    )

    for check in drifted_checks.iterator():
        decision = check.prediction.decision
        if not decision:
            continue
        # Already covered by a retro on this decision triggered by drift?
        has_retro = DecisionRetrospective.objects.filter(
            decision=decision,
            triggered_by="drift",
        ).exists()
        if has_retro:
            continue

        try:
            retro = DecisionRetrospective.objects.create(
                organization=check.organization,
                decision=decision,
                triggered_by="drift",
                triggered_by_check=check,
                summary=(
                    f"Auto-opened by drift sweep: '{check.prediction.dimension}' "
                    f"landed off-track"
                    + (f" ({check.drift_pct:+.1f}% from target)." if check.drift_pct is not None else ".")
                ),
            )
            drifted_followup_count += 1

            # Tell the decision maker + stakeholders.
            recipients = _drift_recipients(decision)
            link = f"/decisions/{decision.id}"
            for user in recipients:
                try:
                    create_notification(
                        user=user,
                        notification_type="decision",
                        title=f"Lesson needed: {decision.title}",
                        message=(
                            f"Reality on \"{check.prediction.statement}\" landed off-track. "
                            f"A retrospective was opened — capture the lesson so we don't repeat it."
                        ),
                        link=link,
                    )
                except Exception as exc:
                    logger.warning("decision_intelligence_sweep: retro notify failed for user=%s: %s", user.id, exc)
                    errors += 1
        except Exception as exc:
            logger.warning("decision_intelligence_sweep: retro create failed for decision=%s: %s", decision.id, exc)
            errors += 1

    summary = {
        "overdue_nudges_sent": overdue_count,
        "auto_retros_opened": drifted_followup_count,
        "errors": errors,
    }
    logger.info("decision_intelligence_sweep complete: %s", summary)
    return summary


def _drift_recipients(decision):
    """Decision maker first, then unique stakeholders. De-duped."""
    seen = set()
    out = []
    if decision.decision_maker_id and decision.decision_maker_id not in seen:
        seen.add(decision.decision_maker_id)
        out.append(decision.decision_maker)
    try:
        for stakeholder in decision.stakeholders.all():
            if stakeholder.id not in seen:
                seen.add(stakeholder.id)
                out.append(stakeholder)
    except Exception:
        pass
    return out


# ----------------------------------------------------------------------------
# Weekly intelligence digest
# ----------------------------------------------------------------------------

@shared_task(name="apps.decisions.tasks.send_weekly_intelligence_digest")
def send_weekly_intelligence_digest():
    """Mondays at 9 AM: per-org weekly Decision Intelligence digest.

    Each organization with engagement (predictions or retrospectives) receives
    an email summarizing the past week's decision activity, sent to admins and
    managers. Silent weeks are skipped.
    """
    from datetime import timedelta

    from apps.organizations.models import Organization, User
    from apps.decisions.intelligence_models import (
        DecisionOutcomeCheck,
        DecisionPrediction,
        DecisionRetrospective,
    )
    from apps.decisions.models import Decision
    from apps.notifications.email_service import send_email

    now = timezone.now()
    week_start = now - timedelta(days=7)
    today = now.date()

    sent = 0
    skipped = 0
    failed = 0

    for org in Organization.objects.filter(is_active=True).iterator():
        any_signal = (
            DecisionPrediction.objects.filter(organization=org).exists()
            or DecisionRetrospective.objects.filter(organization=org).exists()
        )
        if not any_signal:
            skipped += 1
            continue

        new_decisions = Decision.objects.filter(organization=org, created_at__gte=week_start)
        new_predictions = DecisionPrediction.objects.filter(organization=org, created_at__gte=week_start)
        new_checks = DecisionOutcomeCheck.objects.filter(organization=org, observed_at__gte=week_start)
        new_retros = (
            DecisionRetrospective.objects.filter(organization=org, created_at__gte=week_start)
            .select_related("decision", "author")
            .order_by("-created_at")
        )

        drift_signals = list(
            new_checks.filter(drift_band__in=["off_track", "drifting"])
            .select_related("prediction", "prediction__decision")
            .order_by("-observed_at")[:5]
        )

        overdue_predictions = list(
            DecisionPrediction.objects
            .filter(organization=org, check_at__lte=today)
            .exclude(checks__observed_at__gte=now - timedelta(days=14))
            .select_related("decision")[:5]
        )

        totals = {
            "new_decisions": new_decisions.count(),
            "new_predictions": new_predictions.count(),
            "new_checks": new_checks.count(),
            "new_retros": new_retros.count(),
            "overdue": len(overdue_predictions),
        }
        if sum(totals.values()) == 0:
            skipped += 1
            continue

        recent_deltas = list(
            DecisionRetrospective.objects
            .filter(organization=org, created_at__gte=now - timedelta(days=30))
            .exclude(confidence_delta__isnull=True)
            .values_list("confidence_delta", flat=True)
        )
        quality_score = None
        if recent_deltas:
            avg = sum(recent_deltas) / len(recent_deltas)
            quality_score = round(((avg + 10) / 20) * 100)

        recipients = list(
            User.objects.filter(
                organization=org,
                is_active=True,
                role__in=["admin", "manager"],
            ).exclude(email="")
        )
        if not recipients:
            skipped += 1
            continue

        html = _render_weekly_digest_html(
            org=org,
            totals=totals,
            quality_score=quality_score,
            drift_signals=drift_signals,
            overdue_predictions=overdue_predictions,
            new_retros=list(new_retros[:5]),
        )
        text = _render_weekly_digest_text(
            org=org,
            totals=totals,
            quality_score=quality_score,
            drift_count=len(drift_signals),
            overdue_count=totals["overdue"],
        )
        subject = "Decision Intelligence · " + org.name + " · This week"

        for user in recipients:
            try:
                ok = send_email(user.email, subject, html, text_content=text)
                if ok:
                    sent += 1
                else:
                    failed += 1
            except Exception as exc:
                logger.warning("Failed to send weekly digest to %s: %s", user.email, exc)
                failed += 1

    summary = {"sent": sent, "skipped_orgs": skipped, "failed": failed}
    logger.info("send_weekly_intelligence_digest complete: %s", summary)
    return summary


def _esc_html(value):
    return (str(value or "")
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))


def _render_weekly_digest_html(*, org, totals, quality_score, drift_signals, overdue_predictions, new_retros):
    from django.conf import settings

    base_url = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/") or "https://knoledgr.com"

    quality_html = ""
    if quality_score is not None:
        if quality_score >= 70:
            band_label, band_color = "Healthy decisions", "#00875A"
        elif quality_score >= 40:
            band_label, band_color = "Watch closely", "#FF8B00"
        else:
            band_label, band_color = "At risk", "#DE350B"
        quality_html = (
            "<tr><td style='padding:12px 24px 0 24px;'>"
            "<div style='background:#F7F7FB;border:1px solid #E6E5F2;border-radius:10px;padding:14px 16px;'>"
            "<div style='font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#6B6B85;'>Decision Quality Score</div>"
            "<div style='font-size:32px;font-weight:600;color:#1A1A2E;line-height:1;margin-top:4px;'>"
            + str(quality_score)
            + "<span style='font-size:14px;color:#6B6B85;'> / 100</span></div>"
            "<div style='margin-top:6px;display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:"
            + band_color + "1f;color:" + band_color + ";'>" + band_label + "</div>"
            "</div></td></tr>"
        )

    def section(title, color, rows_html):
        return (
            "<tr><td style='padding:16px 24px 0 24px;'>"
            "<div style='font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:"
            + color + ";'>" + title + "</div>"
            "<table style='width:100%;border-collapse:collapse;margin-top:6px;'>" + rows_html + "</table>"
            "</td></tr>"
        )

    drift_html = ""
    if drift_signals:
        rows = []
        for c in drift_signals:
            drift_text = c.drift_band.replace("_", " ")
            drift_pct_text = " (" + ("{:+.1f}%".format(c.drift_pct)) + ")" if c.drift_pct is not None else ""
            rows.append(
                "<tr><td style='padding:8px 0;border-bottom:1px solid #EFEFF5;'>"
                "<a href='" + base_url + "/decisions/" + str(c.prediction.decision_id)
                + "' style='color:#2684FF;text-decoration:none;font-weight:600;font-size:13px;'>"
                + _esc_html(c.prediction.decision.title) + "</a><br/>"
                "<span style='font-size:12px;color:#6B6B85;'>"
                + _esc_html(c.prediction.dimension) + " landed " + _esc_html(drift_text) + drift_pct_text
                + "</span></td></tr>"
            )
        drift_html = section("Drift signals this week", "#DE350B", "".join(rows))

    overdue_html = ""
    if overdue_predictions:
        rows = []
        for p in overdue_predictions:
            check_at = p.check_at.isoformat() if p.check_at else "—"
            rows.append(
                "<tr><td style='padding:8px 0;border-bottom:1px solid #EFEFF5;'>"
                "<a href='" + base_url + "/decisions/" + str(p.decision_id)
                + "' style='color:#2684FF;text-decoration:none;font-weight:600;font-size:13px;'>"
                + _esc_html(p.decision.title) + "</a><br/>"
                "<span style='font-size:12px;color:#6B6B85;'>"
                + _esc_html(p.dimension) + " · check date " + check_at + "</span></td></tr>"
            )
        overdue_html = section("Overdue check-ins", "#B45309", "".join(rows))

    retro_html = ""
    if new_retros:
        rows = []
        for r in new_retros:
            lesson = (r.lesson or r.summary or "")[:300]
            delta_html = ""
            if r.confidence_delta is not None:
                delta_html = (
                    "<div style='margin-top:4px;font-size:11px;color:#6E56FF;font-weight:600;'>"
                    "Confidence delta: " + ("{:+d}".format(r.confidence_delta)) + "</div>"
                )
            rows.append(
                "<tr><td style='padding:10px 0;border-bottom:1px solid #EFEFF5;'>"
                "<a href='" + base_url + "/decisions/" + str(r.decision_id)
                + "' style='color:#2684FF;text-decoration:none;font-weight:600;font-size:13px;'>"
                + _esc_html(r.decision.title) + "</a><br/>"
                "<span style='font-size:13px;color:#1A1A2E;line-height:1.5;'>" + _esc_html(lesson) + "</span>"
                + delta_html + "</td></tr>"
            )
        retro_html = section("Lessons learned this week", "#6E56FF", "".join(rows))

    stat_cells = (
        _stat_cell("New decisions", totals["new_decisions"])
        + _stat_cell("Predictions", totals["new_predictions"])
        + _stat_cell("Outcome checks", totals["new_checks"])
        + _stat_cell("Retros", totals["new_retros"])
    )

    org_name = _esc_html(org.name)
    return (
        "<html><body style='margin:0;padding:0;background:#F4F5F7;"
        "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A1A2E;'>"
        "<table align='center' style='max-width:640px;width:100%;border-collapse:collapse;margin:0 auto;"
        "background:#FFFFFF;border:1px solid #E6E5F2;border-radius:12px;overflow:hidden;'>"
        "<tr><td style='background:linear-gradient(135deg,#6E56FF,#2684FF);padding:20px 24px;color:#FFFFFF;'>"
        "<div style='font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.85;'>"
        "Decision Intelligence · Weekly digest</div>"
        "<div style='font-size:20px;font-weight:600;margin-top:4px;'>" + org_name + "</div>"
        "</td></tr>"
        "<tr><td style='padding:20px 24px 0 24px;'>"
        "<table style='width:100%;border-collapse:collapse;'><tr>" + stat_cells + "</tr></table>"
        "</td></tr>"
        + quality_html + drift_html + overdue_html + retro_html
        + "<tr><td style='padding:24px;text-align:center;'>"
        "<a href='" + base_url + "/decisions/intelligence' style='display:inline-block;"
        "background:linear-gradient(135deg,#6E56FF,#2684FF);color:#FFFFFF;text-decoration:none;"
        "padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;'>"
        "View workspace scorecard →</a></td></tr>"
        "<tr><td style='padding:12px 24px 24px 24px;font-size:11px;color:#6B6B85;text-align:center;'>"
        "Knoledgr · Weekly digest · Sent because you're an admin or manager in " + org_name + "."
        "</td></tr></table></body></html>"
    )


def _stat_cell(label, value):
    return (
        "<td width='25%' style='padding:0 4px;'>"
        "<div style='background:#F7F7FB;border:1px solid #E6E5F2;border-radius:8px;padding:10px 12px;text-align:left;'>"
        "<div style='font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#6B6B85;'>"
        + str(label) + "</div>"
        "<div style='font-size:20px;font-weight:600;color:#1A1A2E;margin-top:2px;'>" + str(value) + "</div>"
        "</div></td>"
    )


def _render_weekly_digest_text(*, org, totals, quality_score, drift_count, overdue_count):
    qline = ""
    if quality_score is not None:
        qline = "Decision Quality Score: " + str(quality_score) + "/100\n"
    return (
        "Decision Intelligence · Weekly digest for " + org.name + "\n\n"
        "This week: " + str(totals["new_decisions"]) + " decisions, "
        + str(totals["new_predictions"]) + " predictions, "
        + str(totals["new_checks"]) + " outcome checks, "
        + str(totals["new_retros"]) + " retrospectives.\n"
        + qline +
        "Drift signals this week: " + str(drift_count) + "\n"
        "Overdue check-ins: " + str(overdue_count) + "\n\n"
        "Open the workspace scorecard: /decisions/intelligence\n"
    )
