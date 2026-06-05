import logging

from celery import shared_task

from apps.organizations.models import Organization
from .deep_learning import DeepKnowledgeTrainer

logger = logging.getLogger(__name__)


@shared_task
def train_org_knowledge_model(org_id, epochs=3, max_samples=1200):
    """Train organization-specific deep knowledge model."""
    org = Organization.objects.filter(id=org_id, is_active=True).first()
    if not org:
        return {"status": "skipped", "org_id": org_id, "reason": "organization_not_found_or_inactive"}

    trainer = DeepKnowledgeTrainer(org)
    try:
        payload = trainer.train(epochs=int(epochs), max_samples=int(max_samples))
    except Exception as exc:
        return {"status": "failed", "org_id": org_id, "org_slug": org.slug, "error": str(exc)}

    return {
        "status": "ok",
        "org_id": org_id,
        "org_slug": org.slug,
        "dataset_size": payload.get("dataset_size"),
        "metrics": payload.get("metrics"),
    }


@shared_task
def train_all_org_knowledge_models_nightly(epochs=3, max_samples=1200):
    """Nightly training job across active organizations."""
    summaries = []
    for org_id in Organization.objects.filter(is_active=True).values_list("id", flat=True):
        summaries.append(train_org_knowledge_model(org_id, epochs=epochs, max_samples=max_samples))

    ok = sum(1 for row in summaries if row.get("status") == "ok")
    failed = sum(1 for row in summaries if row.get("status") == "failed")
    skipped = sum(1 for row in summaries if row.get("status") == "skipped")
    return {
        "trained_orgs": ok,
        "failed_orgs": failed,
        "skipped_orgs": skipped,
        "total_orgs": len(summaries),
        "details": summaries,
    }


@shared_task(name="knowledge.drive_agent_run", bind=True, max_retries=0)
def drive_agent_run(self, run_id):
    """Background driver for an AgentRun.

    Picks up the run, replays its Anthropic message history, and resumes the
    tool-use loop until the run lands (completed / awaiting_approval / failed).
    Safe to retrigger: if the run is already in a terminal state it returns a
    no-op summary.
    """
    from .models import AgentRun
    from .agent import _run_loop

    run = AgentRun.objects.filter(id=run_id).first()
    if not run:
        return {"status": "missing", "run_id": run_id}
    if run.status in {"completed", "failed", "cancelled"}:
        return {"status": run.status, "run_id": run_id}

    try:
        _run_loop(run, org=run.organization, user=run.user)
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Agent run %s failed in worker: %s", run_id, exc)
        run.refresh_from_db()
        if run.status not in {"completed", "failed", "cancelled"}:
            run.status = "failed"
            run.error = f"Worker crashed: {exc}"
            run.save(update_fields=["status", "error", "updated_at"])
        return {"status": "failed", "run_id": run_id, "error": str(exc)}

    run.refresh_from_db()
    return {"status": run.status, "run_id": run_id, "iterations": run.iterations}
