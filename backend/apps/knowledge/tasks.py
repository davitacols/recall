from celery import shared_task

from apps.organizations.models import Organization
from .deep_learning import DeepKnowledgeTrainer


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
