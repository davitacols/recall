from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from apps.business.models import Goal, Meeting, Task
from apps.business.document_models import Document
from apps.agile.models import Project, Issue
from apps.knowledge.context_engine import ContextEngine
from apps.knowledge.unified_models import UnifiedActivity

@receiver(post_save, sender=Goal)
def auto_link_goal(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content(instance, instance.organization)

@receiver(post_save, sender=Meeting)
def auto_link_meeting(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content(instance, instance.organization)
        if instance.created_by:
            UnifiedActivity.objects.create(
                organization=instance.organization,
                user=instance.created_by,
                activity_type='meeting_scheduled',
                content_type=ContentType.objects.get_for_model(instance),
                object_id=instance.id,
                title=instance.title,
                description=instance.description[:200] if instance.description else '',
            )

@receiver(post_save, sender=Task)
def auto_link_task(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content(instance, instance.organization)
    if instance.status == 'done' and instance.assigned_to:
        exists = UnifiedActivity.objects.filter(
            organization=instance.organization,
            activity_type='task_completed',
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.id,
        ).exists()
        if not exists:
            UnifiedActivity.objects.create(
                organization=instance.organization,
                user=instance.assigned_to,
                activity_type='task_completed',
                content_type=ContentType.objects.get_for_model(instance),
                object_id=instance.id,
                title=instance.title,
                description=instance.description[:200] if instance.description else '',
            )

@receiver(post_save, sender=Document)
def auto_link_document(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content(instance, instance.organization)
        if instance.created_by:
            UnifiedActivity.objects.create(
                organization=instance.organization,
                user=instance.created_by,
                activity_type='document_uploaded',
                content_type=ContentType.objects.get_for_model(instance),
                object_id=instance.id,
                title=instance.title,
                description=instance.description[:200] if instance.description else '',
            )

@receiver(post_save, sender=Project)
def auto_link_project(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content(instance, instance.organization)

@receiver(post_save, sender=Issue)
def auto_link_issue(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content(instance, instance.organization)
