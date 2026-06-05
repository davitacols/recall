"""HTTP API for Decision Intelligence.

Endpoints:
    GET    /decisions/{id}/predictions/            list predictions
    POST   /decisions/{id}/predictions/            create prediction
    GET    /decisions/predictions/{pred_id}/       prediction detail + checks
    POST   /decisions/predictions/{pred_id}/checks/  log observation
    GET    /decisions/{id}/drift/                  drift report
    GET    /decisions/{id}/retrospectives/         list retros
    POST   /decisions/{id}/retrospectives/         create retro
    GET    /decisions/{id}/twins/                  list twin runs
    POST   /decisions/{id}/twins/                  spawn a twin run (kicks off agent)
    GET    /decisions/twins/{twin_id}/             twin detail
    GET    /decisions/intelligence/overview/       workspace-wide scorecard
"""

from __future__ import annotations

import logging
from datetime import date, datetime

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.decisions.models import Decision
from apps.decisions.intelligence_models import (
    DecisionOutcomeCheck,
    DecisionPrediction,
    DecisionRetrospective,
    DecisionTwinRun,
)

logger = logging.getLogger(__name__)


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

def _user_org_or_400(request):
    org = getattr(request.user, "organization", None)
    if not org:
        return None, Response({"error": "User organization is not configured"}, status=400)
    return org, None


def _decision_or_404(org, decision_id):
    return Decision.objects.filter(organization=org, id=decision_id).first()


def _person(u):
    if not u:
        return None
    return {
        "id": u.id,
        "name": getattr(u, "full_name", "") or getattr(u, "username", ""),
        "email": getattr(u, "email", ""),
    }


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _compute_drift(prediction, observed_value):
    """Compute signed drift_pct and a band classification.

    Returns (drift_pct, drift_band). For text/binary metrics where a numeric
    drift can't be computed, drift_pct is None and the band is inferred.
    """
    target = (prediction.target_value or {})
    observed = (observed_value or {})

    if prediction.metric_kind == "binary":
        t = bool(target.get("value")) if "value" in target else None
        o = bool(observed.get("value")) if "value" in observed else None
        if t is None or o is None:
            return None, "unknown"
        return None, "on_track" if t == o else "off_track"

    if prediction.metric_kind == "text":
        return None, "unknown"

    # number or percent
    try:
        t = float(target.get("value"))
        o = float(observed.get("value"))
    except (TypeError, ValueError):
        return None, "unknown"
    if t == 0:
        # Target was zero — treat any nonzero observation as exceeded/off based on sign.
        if o == 0:
            return 0.0, "on_track"
        return None, "drifting"
    drift = ((o - t) / abs(t)) * 100.0
    abs_drift = abs(drift)
    if drift > 50:
        band = "exceeded"
    elif abs_drift <= 15:
        band = "on_track"
    elif abs_drift <= 50:
        band = "drifting"
    else:
        band = "off_track"
    return round(drift, 2), band


def _serialize_prediction(p, include_checks=False):
    payload = {
        "id": p.id,
        "decision_id": p.decision_id,
        "dimension": p.dimension,
        "statement": p.statement,
        "metric_kind": p.metric_kind,
        "target_value": p.target_value,
        "baseline_value": p.baseline_value,
        "check_at": p.check_at.isoformat() if p.check_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "created_by": _person(p.created_by),
    }
    if include_checks:
        payload["checks"] = [_serialize_check(c) for c in p.checks.all()[:20]]
    else:
        latest = p.checks.order_by("-observed_at").first()
        payload["latest_check"] = _serialize_check(latest) if latest else None
    return payload


def _serialize_check(c):
    if not c:
        return None
    return {
        "id": c.id,
        "prediction_id": c.prediction_id,
        "observed_value": c.observed_value,
        "drift_pct": c.drift_pct,
        "drift_band": c.drift_band,
        "notes": c.notes,
        "observed_at": c.observed_at.isoformat() if c.observed_at else None,
        "observed_by": _person(c.observed_by),
    }


def _serialize_retrospective(r):
    return {
        "id": r.id,
        "decision_id": r.decision_id,
        "triggered_by": r.triggered_by,
        "triggered_by_check_id": r.triggered_by_check_id,
        "summary": r.summary,
        "root_cause": r.root_cause,
        "lesson": r.lesson,
        "confidence_delta": r.confidence_delta,
        "tags": r.tags or [],
        "author": _person(r.author),
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "closed_at": r.closed_at.isoformat() if r.closed_at else None,
    }


def _serialize_twin(t, include_analysis=True):
    payload = {
        "id": t.id,
        "decision_id": t.decision_id,
        "counterfactual_premise": t.counterfactual_premise,
        "status": t.status,
        "confidence": t.confidence,
        "agent_run_id": t.agent_run_id,
        "requested_by": _person(t.requested_by),
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
    }
    if include_analysis:
        payload["analysis"] = t.analysis
        payload["estimated_outcomes"] = t.estimated_outcomes or []
    return payload


# ----------------------------------------------------------------------------
# Predictions
# ----------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def decision_predictions(request, decision_id):
    org, err = _user_org_or_400(request)
    if err:
        return err
    decision = _decision_or_404(org, decision_id)
    if not decision:
        return Response({"error": "Decision not found"}, status=404)

    if request.method == "GET":
        predictions = decision.predictions.all().prefetch_related("checks")
        return Response({"results": [_serialize_prediction(p) for p in predictions]})

    data = request.data or {}
    dimension = (data.get("dimension") or "").strip()
    statement = (data.get("statement") or "").strip()
    metric_kind = data.get("metric_kind") or "text"
    target_value = data.get("target_value") or {}
    baseline_value = data.get("baseline_value")
    check_at = _parse_date(data.get("check_at"))

    if not dimension or not statement:
        return Response({"error": "dimension and statement are required"}, status=400)
    if metric_kind not in {"number", "percent", "binary", "text"}:
        return Response({"error": "metric_kind must be one of number/percent/binary/text"}, status=400)
    if not check_at:
        return Response({"error": "check_at must be a valid ISO date"}, status=400)
    if not isinstance(target_value, dict):
        return Response({"error": "target_value must be an object"}, status=400)

    prediction = DecisionPrediction.objects.create(
        organization=org,
        decision=decision,
        dimension=dimension[:80],
        statement=statement,
        metric_kind=metric_kind,
        target_value=target_value,
        baseline_value=baseline_value if isinstance(baseline_value, dict) else None,
        check_at=check_at,
        created_by=request.user,
    )
    try:
        from apps.organizations.webhook_models import dispatch, EVENT_PREDICTION_LOGGED
        dispatch(
            organization=org,
            event=EVENT_PREDICTION_LOGGED,
            payload={
                "prediction": _serialize_prediction(prediction),
                "decision_id": decision.id,
                "actor_id": request.user.id,
            },
        )
    except Exception:
        pass
    return Response(_serialize_prediction(prediction), status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def prediction_detail(request, prediction_id):
    org, err = _user_org_or_400(request)
    if err:
        return err
    p = DecisionPrediction.objects.filter(organization=org, id=prediction_id).prefetch_related("checks").first()
    if not p:
        return Response({"error": "Prediction not found"}, status=404)
    return Response(_serialize_prediction(p, include_checks=True))


# ----------------------------------------------------------------------------
# Outcome checks (reality observations)
# ----------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def log_outcome_check(request, prediction_id):
    org, err = _user_org_or_400(request)
    if err:
        return err
    prediction = DecisionPrediction.objects.filter(organization=org, id=prediction_id).first()
    if not prediction:
        return Response({"error": "Prediction not found"}, status=404)

    data = request.data or {}
    observed_value = data.get("observed_value") or {}
    notes = (data.get("notes") or "").strip()
    if not isinstance(observed_value, dict):
        return Response({"error": "observed_value must be an object"}, status=400)

    drift_pct, drift_band = _compute_drift(prediction, observed_value)

    check = DecisionOutcomeCheck.objects.create(
        organization=org,
        prediction=prediction,
        observed_value=observed_value,
        drift_pct=drift_pct,
        drift_band=drift_band,
        notes=notes,
        observed_by=request.user,
    )

    # Auto-open a retrospective when reality is dramatically off-track.
    auto_retro = None
    if drift_band == "off_track":
        existing = DecisionRetrospective.objects.filter(
            organization=org,
            decision=prediction.decision,
            triggered_by_check=check,
        ).first()
        if not existing:
            auto_retro = DecisionRetrospective.objects.create(
                organization=org,
                decision=prediction.decision,
                triggered_by="drift",
                triggered_by_check=check,
                summary=(
                    f"Auto-opened: reality drifted off-track on '{prediction.dimension}'. "
                    f"Latest observation deviates {drift_pct:+.1f}% from target."
                    if drift_pct is not None
                    else f"Auto-opened: reality is off-track on '{prediction.dimension}'."
                ),
            )

    try:
        from apps.organizations.webhook_models import (
            dispatch, EVENT_OUTCOME_LOGGED, EVENT_RETRO_OPENED,
        )
        dispatch(
            organization=org,
            event=EVENT_OUTCOME_LOGGED,
            payload={
                "check": _serialize_check(check),
                "prediction_id": prediction.id,
                "decision_id": prediction.decision_id,
                "actor_id": request.user.id,
            },
        )
        if auto_retro:
            dispatch(
                organization=org,
                event=EVENT_RETRO_OPENED,
                payload={
                    "retro_id": auto_retro.id,
                    "decision_id": prediction.decision_id,
                    "triggered_by": "drift",
                },
            )
    except Exception:
        pass

    return Response({
        **_serialize_check(check),
        "auto_opened_retrospective_id": auto_retro.id if auto_retro else None,
    }, status=201)


# ----------------------------------------------------------------------------
# Drift report
# ----------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def decision_drift_report(request, decision_id):
    """Aggregate drift across every prediction on a decision."""
    org, err = _user_org_or_400(request)
    if err:
        return err
    decision = _decision_or_404(org, decision_id)
    if not decision:
        return Response({"error": "Decision not found"}, status=404)

    predictions = decision.predictions.all().prefetch_related("checks")
    bands = []
    rows = []
    for p in predictions:
        latest = p.checks.order_by("-observed_at").first()
        if latest:
            bands.append(latest.drift_band)
        rows.append({
            "prediction_id": p.id,
            "dimension": p.dimension,
            "statement": p.statement,
            "check_at": p.check_at.isoformat() if p.check_at else None,
            "latest_check": _serialize_check(latest),
        })

    # Headline band: the worst-case of the latest checks (off_track > drifting > on_track/exceeded)
    if not bands:
        headline = "no_outcomes"
    elif any(b == "off_track" for b in bands):
        headline = "off_track"
    elif any(b == "drifting" for b in bands):
        headline = "drifting"
    elif all(b in {"on_track", "exceeded"} for b in bands):
        headline = "on_track"
    else:
        headline = "mixed"

    return Response({
        "decision_id": decision.id,
        "title": decision.title,
        "status": decision.status,
        "headline_band": headline,
        "predictions": rows,
    })


# ----------------------------------------------------------------------------
# Retrospectives
# ----------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def decision_retrospectives(request, decision_id):
    org, err = _user_org_or_400(request)
    if err:
        return err
    decision = _decision_or_404(org, decision_id)
    if not decision:
        return Response({"error": "Decision not found"}, status=404)

    if request.method == "GET":
        retros = decision.retrospectives.all()[:50]
        return Response({"results": [_serialize_retrospective(r) for r in retros]})

    data = request.data or {}
    triggered_by = data.get("triggered_by") or "manual"
    if triggered_by not in {"drift", "milestone", "manual", "agent"}:
        triggered_by = "manual"
    retro = DecisionRetrospective.objects.create(
        organization=org,
        decision=decision,
        triggered_by=triggered_by,
        summary=(data.get("summary") or "").strip(),
        root_cause=(data.get("root_cause") or "").strip(),
        lesson=(data.get("lesson") or "").strip(),
        confidence_delta=data.get("confidence_delta"),
        tags=data.get("tags") or [],
        author=request.user,
    )
    try:
        from apps.organizations.webhook_models import dispatch, EVENT_RETRO_OPENED
        dispatch(
            organization=org,
            event=EVENT_RETRO_OPENED,
            payload={
                "retro_id": retro.id,
                "decision_id": decision.id,
                "triggered_by": triggered_by,
                "actor_id": request.user.id,
            },
        )
    except Exception:
        pass
    return Response(_serialize_retrospective(retro), status=201)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_retrospective(request, retro_id):
    org, err = _user_org_or_400(request)
    if err:
        return err
    retro = DecisionRetrospective.objects.filter(organization=org, id=retro_id).first()
    if not retro:
        return Response({"error": "Retrospective not found"}, status=404)
    data = request.data or {}
    for field in ("summary", "root_cause", "lesson"):
        if field in data:
            setattr(retro, field, (data.get(field) or "").strip())
    if "confidence_delta" in data:
        try:
            retro.confidence_delta = int(data["confidence_delta"]) if data["confidence_delta"] is not None else None
        except (TypeError, ValueError):
            pass
    if "tags" in data and isinstance(data["tags"], list):
        retro.tags = data["tags"]
    if data.get("closed"):
        retro.closed_at = timezone.now()
    retro.save()
    return Response(_serialize_retrospective(retro))


# ----------------------------------------------------------------------------
# Twin runs
# ----------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def decision_twins(request, decision_id):
    org, err = _user_org_or_400(request)
    if err:
        return err
    decision = _decision_or_404(org, decision_id)
    if not decision:
        return Response({"error": "Decision not found"}, status=404)

    if request.method == "GET":
        twins = decision.twin_runs.all()[:25]
        return Response({"results": [_serialize_twin(t, include_analysis=False) for t in twins]})

    data = request.data or {}
    premise = (data.get("counterfactual_premise") or data.get("premise") or "").strip()
    if not premise:
        return Response({"error": "counterfactual_premise is required"}, status=400)

    twin = DecisionTwinRun.objects.create(
        organization=org,
        decision=decision,
        counterfactual_premise=premise,
        status="queued",
        requested_by=request.user,
    )

    # Kick off the agent run that will fill in the twin's analysis.
    try:
        from apps.knowledge.agent import start_run as start_agent_run
        goal = (
            f"Counterfactual analysis for decision #{decision.id} \"{decision.title}\". "
            f"Use get_decision_outcome to read the original decision and its observed outcomes, "
            f"then analyze the premise: \"{premise}\". "
            f"Produce a side-by-side comparison and cite the workspace evidence you used."
        )
        run = start_agent_run(
            org=org,
            user=request.user,
            goal=goal,
            profile_slug="decision-reviewer",
        )
        twin.agent_run = run
        twin.status = "running" if run.status == "running" else twin.status
        twin.save(update_fields=["agent_run", "status"])
    except Exception as exc:
        logger.exception("Failed to start agent run for twin %s: %s", twin.id, exc)
        twin.status = "failed"
        twin.analysis = f"Could not start agent: {exc}"
        twin.save(update_fields=["status", "analysis", "completed_at"])

    return Response(_serialize_twin(twin), status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def twin_detail(request, twin_id):
    org, err = _user_org_or_400(request)
    if err:
        return err
    twin = DecisionTwinRun.objects.filter(organization=org, id=twin_id).first()
    if not twin:
        return Response({"error": "Twin run not found"}, status=404)

    # If the agent has finished and the twin is still queued/running,
    # update from the agent's final_answer so the caller sees it inline.
    if twin.agent_run_id and twin.status in {"queued", "running"}:
        run = twin.agent_run
        if run and run.status in {"completed", "failed"}:
            twin.analysis = run.final_answer or twin.analysis
            twin.status = "completed" if run.status == "completed" else "failed"
            twin.completed_at = run.updated_at
            twin.save(update_fields=["analysis", "status", "completed_at"])

    return Response(_serialize_twin(twin))


# ----------------------------------------------------------------------------
# Workspace-wide intelligence overview
# ----------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def similar_decisions(request):
    """Before-you-decide: surface past similar decisions with their outcomes.

    Driven from the new-decision form on every debounced keystroke. Returns a
    rich payload — not just titles — so the inline panel can show what
    happened, what landed off-track, and what lesson was learned.

    Body: { "title": "...", "description": "..."?, "limit": 5? }
    """
    org, err = _user_org_or_400(request)
    if err:
        return err

    data = request.data or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    if not title and not description:
        return Response({"results": []})

    query = " ".join(filter(None, [title, description])).strip()
    limit = max(1, min(int(data.get("limit") or 5), 12))

    from apps.knowledge.search_engine import get_search_engine
    engine = get_search_engine()
    search_data = engine.search(query, org.id, filters={"kinds": ["decision"]}, limit=limit)

    # Pull the bucket of decision hits regardless of which key the engine used.
    bucket = (search_data or {}).get("decisions") or (search_data or {}).get("decision") or []
    if not bucket and isinstance(search_data, dict):
        for value in search_data.values():
            if isinstance(value, list) and value and isinstance(value[0], dict):
                first_type = str(value[0].get("type", "")).lower()
                if "decision" in first_type:
                    bucket = value
                    break

    ids = [item.get("id") for item in bucket if item.get("id")]
    if not ids:
        return Response({"results": []})

    decisions = (
        Decision.objects.filter(organization=org, id__in=ids)
        .prefetch_related("predictions", "predictions__checks", "retrospectives")
    )

    # Preserve the engine's ranking when ordering the response.
    id_order = {dec_id: idx for idx, dec_id in enumerate(ids)}
    decisions = sorted(decisions, key=lambda d: id_order.get(d.id, 999))

    results = []
    for dec in decisions:
        # Outcome roll-up across all predictions.
        bands = []
        worst_drift_pct = None
        for p in dec.predictions.all():
            latest = p.checks.order_by("-observed_at").first()
            if latest:
                bands.append(latest.drift_band)
                if latest.drift_pct is not None:
                    if worst_drift_pct is None or abs(latest.drift_pct) > abs(worst_drift_pct):
                        worst_drift_pct = latest.drift_pct

        if not bands:
            outcome_label = "no_outcomes"
            outcome_text = "No outcomes logged yet"
        elif any(b == "off_track" for b in bands):
            outcome_label = "off_track"
            outcome_text = "Drifted off-track"
        elif any(b == "drifting" for b in bands):
            outcome_label = "drifting"
            outcome_text = "Drifted"
        elif all(b in {"on_track", "exceeded"} for b in bands):
            outcome_label = "on_track"
            outcome_text = "On track or better"
        else:
            outcome_label = "mixed"
            outcome_text = "Mixed outcomes"

        # Lessons in priority order — most recent retrospective first.
        lessons = []
        for r in dec.retrospectives.all()[:3]:
            text = (r.lesson or r.summary or "").strip()
            if not text:
                continue
            lessons.append({
                "id": r.id,
                "text": text,
                "tags": r.tags or [],
                "confidence_delta": r.confidence_delta,
                "triggered_by": r.triggered_by,
            })

        results.append({
            "id": dec.id,
            "title": dec.title,
            "status": dec.status,
            "impact_level": dec.impact_level,
            "created_at": dec.created_at.isoformat() if dec.created_at else None,
            "outcome_label": outcome_label,
            "outcome_text": outcome_text,
            "worst_drift_pct": worst_drift_pct,
            "prediction_count": dec.predictions.count(),
            "lessons": lessons,
            "url": f"/decisions/{dec.id}",
        })

    return Response({"results": results})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def trigger_intelligence_sweep(request):
    """Manually trigger the daily intelligence sweep. Admin-only.

    Useful when debugging drift/notification flows without waiting for the
    scheduled beat to fire.
    """
    org, err = _user_org_or_400(request)
    if err:
        return err
    role = getattr(request.user, "role", "")
    if role not in {"admin", "manager"}:
        return Response({"error": "Only admins or managers can trigger the sweep"}, status=403)
    try:
        from apps.decisions.tasks import decision_intelligence_sweep
        summary = decision_intelligence_sweep()
    except Exception as exc:
        logger.exception("Manual intelligence sweep failed: %s", exc)
        return Response({"error": f"Sweep failed: {exc}"}, status=500)
    return Response({"summary": summary})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def intelligence_overview(request):
    """Workspace-wide decision intelligence scorecard."""
    org, err = _user_org_or_400(request)
    if err:
        return err

    # Recent drift signals — decisions whose latest check landed off_track or drifting.
    drifted = (
        DecisionOutcomeCheck.objects.filter(
            organization=org,
            drift_band__in=["off_track", "drifting"],
        )
        .select_related("prediction", "prediction__decision")
        .order_by("-observed_at")[:15]
    )

    # Predictions whose check_at has passed without a recent observation.
    today = timezone.now().date()
    pending = (
        DecisionPrediction.objects
        .filter(organization=org, check_at__lte=today)
        .exclude(checks__observed_at__gte=timezone.now() - timezone.timedelta(days=14))
        .select_related("decision")[:20]
    )

    # Recent retrospectives (lessons learned feed).
    retros = (
        DecisionRetrospective.objects.filter(organization=org)
        .select_related("decision", "author")
        .order_by("-created_at")[:10]
    )

    # Workspace counts.
    totals = {
        "predictions": DecisionPrediction.objects.filter(organization=org).count(),
        "outcome_checks": DecisionOutcomeCheck.objects.filter(organization=org).count(),
        "retrospectives": DecisionRetrospective.objects.filter(organization=org).count(),
        "twin_runs": DecisionTwinRun.objects.filter(organization=org).count(),
    }

    return Response({
        "totals": totals,
        "drift_signals": [
            {
                "decision_id": c.prediction.decision_id,
                "decision_title": c.prediction.decision.title,
                "dimension": c.prediction.dimension,
                "drift_band": c.drift_band,
                "drift_pct": c.drift_pct,
                "observed_at": c.observed_at.isoformat() if c.observed_at else None,
            }
            for c in drifted
        ],
        "pending_checks": [
            {
                "prediction_id": p.id,
                "decision_id": p.decision_id,
                "decision_title": p.decision.title,
                "dimension": p.dimension,
                "statement": p.statement,
                "check_at": p.check_at.isoformat() if p.check_at else None,
                "overdue_days": (today - p.check_at).days,
            }
            for p in pending
        ],
        "recent_retros": [
            {
                "id": r.id,
                "decision_id": r.decision_id,
                "decision_title": r.decision.title,
                "lesson": (r.lesson or r.summary or "").strip()[:240],
                "tags": r.tags or [],
                "confidence_delta": r.confidence_delta,
                "author": _person(r.author),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in retros
        ],
    })
